// Конфигурация
const API_KEY = "0385b4b3574b96a26453f275b7d20a02";
let currentCityName = "Москва";

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#4CAF50');
tg.setBackgroundColor('#f0f8ff');
document.body.dataset.theme = tg.colorScheme;

// Элементы DOM
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const currentIcon = document.getElementById('current-icon');
const currentTemp = document.getElementById('current-temp');
const currentCity = document.getElementById('current-city');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const forecastContainer = document.getElementById('forecast');

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
        // Очищаем предыдущий прогноз
        forecastContainer.innerHTML = '';
        
        // Текущая погода
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const currentData = await currentResponse.json();
        
        if (currentData.cod !== 200) {
            throw new Error("Город не найден! Попробуйте другой.");
        }

        // Прогноз на 5 дней
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const forecastData = await forecastResponse.json();
        
        if (forecastData.cod !== "200") {
            throw new Error("Ошибка при получении прогноза");
        }

        // Отображение данных
        displayWeather(currentData, forecastData);
        
        // Сохраняем город
        localStorage.setItem('lastCity', city);
        currentCityName = city;
        
    } catch (error) {
        console.error("Ошибка:", error);
        // Показываем ошибку только если это не первый запуск
        if (cityInput.value.trim()) {
            tg.showAlert("Город не найден! Попробуйте другой.");
        }
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

    // Прогноз (убедимся, что forecast.list существует)
    if (forecast && forecast.list) {
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
            
            forecastContainer.appendChild(forecastItem);
        });
    }

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
        fetchWeather(city);
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
    fetchWeather(savedCity);
});

// Обработка изменений темы Telegram
tg.onEvent('themeChanged', () => {
    document.body.dataset.theme = tg.colorScheme;
});
