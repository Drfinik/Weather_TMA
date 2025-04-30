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
const locationBtn = document.getElementById('location-btn');
const currentIcon = document.getElementById('current-icon');
const currentTemp = document.getElementById('current-temp');
const currentCity = document.getElementById('current-city');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const forecastContainer = document.getElementById('forecast');
const citySuggestions = document.querySelector('.city-suggestions');
const weatherDetails = document.querySelector('.weather-details');

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

// Автодополнение городов
cityInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
        citySuggestions.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
        );
        const cities = await response.json();
        
        citySuggestions.innerHTML = '';
        if (cities.length > 0) {
            cities.forEach(city => {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion';
                suggestion.textContent = `${city.name}, ${city.country}`;
                suggestion.addEventListener('click', () => {
                    cityInput.value = city.name;
                    citySuggestions.style.display = 'none';
                    fetchWeather(city.name);
                });
                citySuggestions.appendChild(suggestion);
            });
            citySuggestions.style.display = 'block';
        } else {
            citySuggestions.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка автодополнения:', error);
        citySuggestions.style.display = 'none';
    }
});

// Скрываем подсказки при клике вне поля
document.addEventListener('click', (e) => {
    if (e.target !== cityInput) {
        citySuggestions.style.display = 'none';
    }
});

// Определение местоположения
function getLocation() {
    if (navigator.geolocation) {
        tg.showPopup({
            title: "Доступ к геолокации",
            message: "Разрешить доступ к вашему местоположению?",
            buttons: [
                {id: 'yes', type: 'default', text: 'Разрешить'},
                {type: 'cancel', text: 'Отмена'}
            ]
        }, (buttonId) => {
            if (buttonId === 'yes') {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            const response = await fetch(
                                `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
                            );
                            const locationData = await response.json();
                            if (locationData.length > 0) {
                                const city = locationData[0].name;
                                cityInput.value = city;
                                fetchWeather(city);
                            }
                        } catch (error) {
                            console.error('Ошибка определения города:', error);
                            tg.showAlert("Не удалось определить город. Введите вручную.");
                        }
                    },
                    (error) => {
                        console.error('Ошибка геолокации:', error);
                        tg.showAlert("Не удалось определить местоположение.");
                    }
                );
            }
        });
    } else {
        tg.showAlert("Геолокация не поддерживается вашим браузером.");
    }
}

locationBtn.addEventListener('click', getLocation);

// Загрузка погоды
async function fetchWeather(city) {
    try {
        forecastContainer.innerHTML = '';
        weatherDetails.innerHTML = '';
        
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const currentData = await currentResponse.json();
        
        if (currentData.cod !== 200) {
            throw new Error("Город не найден! Попробуйте другой.");
        }

        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const forecastData = await forecastResponse.json();
        
        if (forecastData.cod !== "200") {
            throw new Error("Ошибка при получении прогноза");
        }

        displayWeather(currentData, forecastData);
        localStorage.setItem('lastCity', city);
        currentCityName = city;
        
    } catch (error) {
        console.error("Ошибка:", error);
        if (cityInput.value.trim()) {
            tg.showAlert(error.message || "Ошибка при получении данных");
        }
    }
}

// Отображение погоды
function displayWeather(current, forecast) {
    currentIcon.textContent = weatherIcons[current.weather[0].icon] || '🌤️';
    currentTemp.textContent = `${Math.round(current.main.temp)}°C`;
    currentCity.textContent = current.name;
    humidity.textContent = `💧 ${current.main.humidity}%`;
    wind.textContent = `🌬️ ${Math.round(current.wind.speed)} м/с`;

    // Детальная информация
    weatherDetails.innerHTML = `
        <div class="detail">
            <span>Ощущается</span>
            <span>${Math.round(current.main.feels_like)}°C</span>
        </div>
        <div class="detail">
            <span>Давление</span>
            <span>${Math.round(current.main.pressure * 0.75)} мм рт.ст.</span>
        </div>
        <div class="detail">
            <span>Восход</span>
            <span>${new Date(current.sys.sunrise * 1000).toLocaleTimeString('ru', {timeStyle: 'short'})}</span>
        </div>
        <div class="detail">
            <span>Закат</span>
            <span>${new Date(current.sys.sunset * 1000).toLocaleTimeString('ru', {timeStyle: 'short'})}</span>
        </div>
    `;

    // Прогноз
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
