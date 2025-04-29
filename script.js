// Конфигурация
const API_KEY = "0385b4b3574b96a26453f275b7d20a02";
let currentCityName = "Москва"; // Переименовали переменную

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Устанавливаем цвета интерфейса Telegram
tg.setHeaderColor('#4CAF50'); // Зеленый цвет шапки
tg.setBackgroundColor('#f0f8ff'); // Светло-голубой фон

// Получаем текущую тему Telegram
const tgTheme = tg.colorScheme; // 'light' или 'dark'
document.body.dataset.theme = tgTheme;

// Элементы DOM
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const currentIcon = document.getElementById('current-icon');
const currentTemp = document.getElementById('current-temp');
const currentCity = document.getElementById('current-city');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const forecast = document.getElementById('forecast');

// Иконки погоды
const weatherIcons = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '⛅',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

// Загрузка погоды
async function fetchWeather(city) {
    try {
        // Текущая погода
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const currentData = await currentResponse.json();

        // Прогноз на 5 дней
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const forecastData = await forecastResponse.json();

        // Отображение данных
        displayWeather(currentData, forecastData);
        
        // Сохраняем город в localStorage
        localStorage.setItem('lastCity', city);
    } catch (error) {
        console.error("Ошибка:", error);
        tg.showAlert("Город не найден! Попробуйте другой.");
    }
}

// Отображение погоды
function displayWeather(current, forecast) {
    // Текущая погода
    currentIcon.textContent = weatherIcons[current.weather[0].icon] || '🌤️';
    currentTemp.textContent = `${Math.round(current.main.temp)}°C`;
    currentCity.textContent = current.name;
    humidity.textContent = `💧 ${current.main.humidity}%`;
    wind.textContent = `🌬️ ${Math.round(current.wind.speed)} м/с`;

    // Прогноз
    forecast.innerHTML = '';
    const dailyForecast = forecast.list.filter((item, index) => index % 8 === 0);
    
    dailyForecast.slice(0, 5).forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('ru', { weekday: 'short' });
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div>${dayName}</div>
            <div style="font-size:24px">${weatherIcons[day.weather[0].icon] || '🌤️'}</div>
            <div>${Math.round(day.main.temp)}°C</div>
        `;
        
        forecast.appendChild(forecastItem);
    });

    // Анимация
    if (window.gsap) {
        gsap.from(".current-weather, .forecast-item", {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5
        });
    }
}

// Обработчики событий
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        currentCityName = city;
        fetchWeather(currentCityName);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Загрузка при старте
document.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity') || 'Москва';
    cityInput.value = savedCity;
    currentCityName = savedCity;
    fetchWeather(currentCityName);
});

// Обработка изменений темы Telegram
tg.onEvent('themeChanged', () => {
    document.body.dataset.theme = tg.colorScheme;
});
