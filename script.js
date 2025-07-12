// --- Основной скрипт логики магазина ---

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация Telegram Web App
  const tg = window.Telegram.WebApp;
  tg.ready();

  const catalogContainer = document.getElementById('product-catalog');
  const loader = document.getElementById('loader');

  // --- 1. Применение конфигурации ---
  function applyConfig() {
    // Устанавливаем заголовок страницы
    document.title = config.shopTitle;

    // Устанавливаем заголовок и логотип в шапке
    document.getElementById('shop-title').textContent = config.shopTitle;
    const logoImg = document.getElementById('logo-img');
    logoImg.src = config.logoPath;
    logoImg.onerror = () => {
        // Если логотип не загрузился, можно его скрыть или показать запасное изображение
        logoImg.style.display = 'none';
        console.warn('Логотип не найден по пути:', config.logoPath);
    };


    // Устанавливаем основной цвет как CSS переменную
    document.documentElement.style.setProperty('--primary-color', config.primaryColor);

    // Устанавливаем цвет шапки в приложении Telegram
    tg.setHeaderColor(config.primaryColor);

    // Определяем тему и применяем стили
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('telegram-dark-theme');
    }
  }

  // --- 2. Загрузка и отображение товаров ---
  async function loadProducts() {
    try {
      // Показываем индикатор загрузки
      loader.style.display = 'block';
      catalogContainer.style.display = 'none';

      const response = await fetch('catalog.json');
      if (!response.ok) {
        throw new Error(`Ошибка загрузки каталога: ${response.statusText}`);
      }
      const products = await response.json();

      // Очищаем контейнер перед добавлением новых товаров
      catalogContainer.innerHTML = '';
      
      products.forEach(product => {
        const card = createProductCard(product);
        catalogContainer.appendChild(card);
      });

    } catch (error) {
      console.error(error);
      loader.textContent = 'Не удалось загрузить товары. Попробуйте позже.';
      tg.showAlert('Не удалось загрузить товары. Пожалуйста, попробуйте перезапустить приложение.');
    } finally {
      // Скрываем индикатор загрузки и показываем каталог
      loader.style.display = 'none';
      catalogContainer.style.display = 'grid';
    }
  }

  // --- 3. Создание карточки товара ---
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Форматирование цены для лучшего отображения
    const formattedPrice = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(product.price);

    card.innerHTML = `
      <div class="product-photo">
        <img src="${product.photo}" alt="${product.name}" onerror="this.src='https://placehold.co/600x600?text=Фото';">
      </div>
      <div class="product-details">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-footer">
            <div class="product-price">${formattedPrice}</div>
            <button class="order-button">Заказать</button>
        </div>
      </div>
    `;

    // --- 4. Обработка нажатия на кнопку "Заказать" ---
    const orderButton = card.querySelector('.order-button');
    orderButton.addEventListener('click', () => {
      handleOrder(product);
    });

    return card;
  }

  // --- 5. Отправка данных о заказе в Telegram ---
  function handleOrder(product) {
    // Формируем данные для отправки. Можно добавить больше информации.
    const orderData = {
      productId: product.id,
      productName: product.name,
      price: product.price,
      orderDate: new Date().toISOString() // Добавляем дату заказа
    };

    // Показываем всплывающее уведомление
    tg.showPopup({
        title: 'Подтверждение заказа',
        message: `Вы уверены, что хотите заказать "${product.name}" за ${product.price} RUB?`,
        buttons: [
            { id: 'order', type: 'default', text: 'Да, заказать' },
            { type: 'cancel' },
        ]
    }, (buttonId) => {
        if (buttonId === 'order') {
            // Отправляем данные боту в формате JSON
            tg.sendData(JSON.stringify(orderData));
            // Закрываем приложение после отправки данных
            tg.close();
        }
    });
  }

  // --- Запуск приложения ---
  applyConfig();
  loadProducts();
});
