document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();

    // --- DOM Элементы ---
    const catalogContainer = document.getElementById('product-catalog');
    const loader = document.getElementById('loader');
    const cartButton = document.getElementById('cart-button');
    const cartCounter = document.getElementById('cart-counter');
    const cartModal = document.getElementById('cart-modal');
    const closeCartButton = document.getElementById('close-cart-button');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const submitOrderButton = document.getElementById('submit-order-button');
    const phoneInput = document.getElementById('phone-input');
    const addressInput = document.getElementById('address-input');

    // --- Состояние приложения ---
    let cart = []; // Теперь будет хранить объекты { ...product, quantity: N }

    // --- 1. Применение конфигурации ---
    function applyConfig() {
        document.title = config.shopTitle;
        document.getElementById('shop-title').textContent = config.shopTitle;
        const logoImg = document.getElementById('logo-img');
        logoImg.src = config.logoPath;
        logoImg.onerror = () => { logoImg.style.display = 'none'; };
        document.documentElement.style.setProperty('--primary-color', config.primaryColor);
        tg.setHeaderColor(config.primaryColor);
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('telegram-dark-theme');
        }
    }

    // --- 2. Загрузка и отображение товаров ---
    async function loadProducts() {
        try {
            loader.style.display = 'block';
            catalogContainer.style.display = 'none';
            const response = await fetch('catalog.json');
            if (!response.ok) throw new Error(`Ошибка загрузки каталога: ${response.statusText}`);
            const products = await response.json();
            catalogContainer.innerHTML = '';
            products.forEach(product => {
                const card = createProductCard(product);
                catalogContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            loader.textContent = 'Не удалось загрузить товары.';
        } finally {
            loader.style.display = 'none';
            catalogContainer.style.display = 'grid';
        }
    }

    // --- 3. Создание карточки товара ---
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        const formattedPrice = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(product.price);
        card.innerHTML = `
            <div class="product-photo">
                <img src="${product.photo}" alt="${product.name}" onerror="this.src='https://placehold.co/600x600?text=Фото';">
            </div>
            <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price">${formattedPrice}</div>
                    <button class="add-to-cart-button">В корзину</button>
                </div>
            </div>
        `;
        const addToCartButton = card.querySelector('.add-to-cart-button');
        addToCartButton.addEventListener('click', () => {
            addToCart(product);
        });
        return card;
    }
    
    // --- 4. Логика корзины ---
    function addToCart(product) {
        const existingProduct = cart.find(p => p.id === product.id);
        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCart();
        tg.HapticFeedback.impactOccurred('light');
    }

    function changeQuantity(productId, delta) {
        const product = cart.find(p => p.id === productId);
        if (!product) return;

        product.quantity += delta;

        if (product.quantity <= 0) {
            cart = cart.filter(p => p.id !== productId);
        }
        updateCart();
    }

    function updateCart() {
        const totalItems = cart.reduce((sum, product) => sum + product.quantity, 0);
        cartCounter.textContent = totalItems;
        renderCartItems();
        calculateTotalPrice();
    }

    function renderCartItems() {
        cartItemsContainer.innerHTML = '';
        const orderForm = document.getElementById('order-form');
        const cartSummary = document.querySelector('.cart-summary');

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align: center; opacity: 0.7;">Ваша корзина пуста.</p>';
            orderForm.style.display = 'none';
            cartSummary.style.display = 'none';
            return;
        }
        
        orderForm.style.display = 'block';
        cartSummary.style.display = 'block';

        cart.forEach(product => {
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            const formattedPrice = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(product.price);
            itemEl.innerHTML = `
                <img src="${product.photo}" class="cart-item-img" alt="${product.name}" onerror="this.src='https://placehold.co/600x600?text=Фото';">
                <div class="cart-item-details">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">${formattedPrice}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" data-product-id="${product.id}" data-delta="-1">-</button>
                    <span class="item-quantity">${product.quantity}</span>
                    <button class="quantity-btn" data-product-id="${product.id}" data-delta="1">+</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemEl);
        });

        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const delta = parseInt(e.target.dataset.delta, 10);
                changeQuantity(productId, delta);
            });
        });
    }

    function calculateTotalPrice() {
        const total = cart.reduce((sum, product) => sum + (product.price * product.quantity), 0);
        const formattedTotal = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(total);
        cartTotalPriceEl.textContent = formattedTotal;
    }

    // --- 5. Управление модальным окном ---
    cartButton.addEventListener('click', () => {
        cartModal.style.display = 'flex';
        renderCartItems();
    });

    closeCartButton.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });

    // --- 6. Отправка заказа ---
    submitOrderButton.addEventListener('click', () => {
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();

        if (cart.length === 0) {
            tg.showAlert('Ваша корзина пуста!');
            return;
        }
        if (!phone || !address) {
            tg.showAlert('Пожалуйста, заполните номер телефона и адрес доставки.');
            return;
        }

        const orderData = {
            items: cart.map(p => ({ id: p.id, name: p.name, price: p.price, quantity: p.quantity })),
            totalPrice: cart.reduce((sum, p) => sum + (p.price * p.quantity), 0),
            customer: {
                phone: phone,
                address: address,
            },
            orderDate: new Date().toISOString()
        };

        tg.sendData(JSON.stringify(orderData));
        alert('Данные заказа отправлены в Telegram!');
        tg.close();
    });

    // --- Запуск приложения ---
    applyConfig();
    loadProducts();
});
