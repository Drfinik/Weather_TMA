// Конфигурация
const API_KEY = "0385b4b3574b96a26453f275b7d20a02";
let currentCityName = "Москва";

// Фоновые изображения
const weatherBackgrounds = {
    '01d': 'images/sunny.jpg',
    '01n': 'images/night.jpg',
    // ... остальные фоны ...
};

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы DOM
const elements = {
    cityInput: document.getElementById('city-input'),
    locationBtn: document.getElementById('location-btn'),
    searchBtn: document.getElementById('search-btn'),
    currentCity: document.getElementById('current-city'),
    currentTemp: document.getElementById('current-temp'),
    // ... остальные элементы ...
};

// Иконки погоды
const weatherIcons = {
    '01d': '☀️', '01n': '🌙',
    // ... остальные иконки ...
};

// Автодополнение городов
elements.cityInput.addEventListener('input', async (e) => {
    // ... (остается без изменений) ...
});

// Обработчик кнопки поиска
elements.searchBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim();
    if (city) fetchWeather(city);
});

// Определение местоположения
function getLocation() {
    // ... (остается без изменений) ...
}

// Загрузка погоды
async function fetchWeather(city) {
    try {
        elements.hourlyForecast.innerHTML = '';
        elements.dailyForecast.innerHTML = '';

        // 1. Получаем координаты города
        const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();
        
        if (!geoData.length) throw new Error("Город не найден!");

        const { lat, lon } = geoData[0];

        // 2. Получаем текущую погоду и прогноз
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}&lang=ru`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}&lang=ru`)
        ]);

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        if (currentData.cod !== 200 || forecastData.cod !== "200") {
            throw new Error("Ошибка при получении данных");
        }

        setWeatherBackground(currentData.weather[0].icon);
        displayWeather(currentData, forecastData);
        localStorage.setItem('lastCity', city);
        currentCityName = city;

    } catch (error) {
        console.error("Ошибка:", error);
        tg.showAlert(error.message || "Ошибка при получении данных");
    }
}

// Отображение погоды с интерполяцией часовых данных
function displayWeather(current, forecast) {
    // Основная информация
    elements.currentCity.textContent = current.name;
    elements.currentTemp.textContent = `${Math.round(current.main.temp)}°`;
    elements.currentCondition.textContent = current.weather[0].description;
    elements.tempMax.textContent = `Макс.: ${Math.round(current.main.temp_max)}°`;
    elements.tempMin.textContent = `Мин.: ${Math.round(current.main.temp_min)}°`;

    // Детали (остается без изменений)
    // ...

    // Почасовой прогноз с интерполяцией
    elements.hourlyForecast.innerHTML = '';
    const now = new Date();
    const currentHour = now.getHours();

    // Создаем массив прогнозов на 24 часа
    for (let i = 0; i < 24; i++) {
        const targetHour = (currentHour + i) % 24;
        const targetTime = new Date(now);
        targetTime.setHours(targetHour, 0, 0, 0);

        // Находим два ближайших прогноза для интерполяции
        let prev = forecast.list[0], next = forecast.list[0];
        for (const item of forecast.list) {
            const itemTime = new Date(item.dt * 1000);
            if (itemTime <= targetTime) prev = item;
            if (itemTime >= targetTime && next === forecast.list[0]) next = item;
        }

        // Интерполируем значения
        const prevTime = new Date(prev.dt * 1000);
        const nextTime = new Date(next.dt * 1000);
        const ratio = (targetTime - prevTime) / (nextTime - prevTime);

        const interpolatedTemp = prev.main.temp + (next.main.temp - prev.main.temp) * ratio;
        const interpolatedIcon = ratio < 0.5 ? prev.weather[0].icon : next.weather[0].icon;

        // Создаем элемент прогноза
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="time">${targetHour}:00</div>
            <div class="icon">${weatherIcons[interpolatedIcon] || '🌤️'}</div>
            <div class="temp">${Math.round(interpolatedTemp)}°</div>
        `;
        elements.hourlyForecast.appendChild(hourItem);
    }

    // Дневной прогноз (остается без изменений)
    const dailyForecast = forecast.list.filter((item, index) => index % 8 === 0);
    dailyForecast.slice(0, 10).forEach(day => {
        // ... (код создания элементов дневного прогноза) ...
    });

    // Анимация
    if (window.gsap) {
        gsap.from(".card", { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
    }
}

// Остальные функции (setWeatherBackground, обработчики событий) остаются без изменений
// ... (как в предыдущей версии) ...

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity') || 'Москва';
    elements.cityInput.value = savedCity;
    fetchWeather(savedCity);
});
