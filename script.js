// Конфигурация
const API_KEY = "0385b4b3574b96a26453f275b7d20a02";
let currentCityName = "Москва";

// Фоновые изображения для разных типов погоды
const weatherBackgrounds = {
    '01d': 'images/sunny.jpg',
    '01n': 'images/night.jpg',
    '02d': 'images/partly-cloudy.jpg',
    '02n': 'images/partly-cloudy-night.jpg',
    '03d': 'images/cloudy.jpg',
    '03n': 'images/cloudy-night.jpg',
    '04d': 'images/overcast.jpg',
    '04n': 'images/overcast-night.jpg',
    '09d': 'images/rain.jpg',
    '09n': 'images/rain-night.jpg',
    '10d': 'images/showers.jpg',
    '10n': 'images/showers-night.jpg',
    '11d': 'images/thunderstorm.jpg',
    '11n': 'images/thunderstorm-night.jpg',
    '13d': 'images/snow.jpg',
    '13n': 'images/snow-night.jpg',
    '50d': 'images/fog.jpg',
    '50n': 'images/fog-night.jpg'
};

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы DOM
const elements = {
    cityInput: document.getElementById('city-input'),
    locationBtn: document.getElementById('location-btn'),
    searchBtn: document.getElementById('search-btn'), // Добавлена кнопка поиска
    currentCity: document.getElementById('current-city'),
    currentTemp: document.getElementById('current-temp'),
    currentCondition: document.getElementById('current-condition'),
    tempMax: document.getElementById('temp-max'),
    tempMin: document.getElementById('temp-min'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind'),
    feelsLike: document.getElementById('feels-like'),
    pressure: document.getElementById('pressure'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    visibility: document.getElementById('visibility'),
    uvIndex: document.getElementById('uv-index'),
    hourlyForecast: document.getElementById('hourly-forecast'),
    dailyForecast: document.getElementById('daily-forecast'),
    citySuggestions: document.querySelector('.city-suggestions'),
    weatherBg: document.getElementById('weather-bg')
};

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
elements.cityInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
        elements.citySuggestions.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
        );
        const cities = await response.json();
        
        elements.citySuggestions.innerHTML = '';
        if (cities.length > 0) {
            cities.forEach(city => {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion';
                suggestion.textContent = `${city.name}, ${city.country}`;
                suggestion.addEventListener('click', () => {
                    elements.cityInput.value = city.name;
                    elements.citySuggestions.style.display = 'none';
                    fetchWeather(city.name);
                });
                elements.citySuggestions.appendChild(suggestion);
            });
            elements.citySuggestions.style.display = 'block';
        } else {
            elements.citySuggestions.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка автодополнения:', error);
        elements.citySuggestions.style.display = 'none';
    }
});

// Обработчик кнопки поиска
elements.searchBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

// Скрываем подсказки при клике вне поля
document.addEventListener('click', (e) => {
    if (e.target !== elements.cityInput && e.target !== elements.searchBtn) {
        elements.citySuggestions.style.display = 'none';
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
                                elements.cityInput.value = city;
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

elements.locationBtn.addEventListener('click', getLocation);

// Загрузка погоды
async function fetchWeather(city) {
    try {
        // Очищаем предыдущие данные
        elements.hourlyForecast.innerHTML = '';
        elements.dailyForecast.innerHTML = '';
        
        // Текущая погода
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const currentData = await currentResponse.json();
        
        if (currentData.cod !== 200) {
            throw new Error("Город не найден! Попробуйте другой.");
        }

        // Прогноз
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}&lang=ru`
        );
        const forecastData = await forecastResponse.json();
        
        if (forecastData.cod !== "200") {
            throw new Error("Ошибка при получении прогноза");
        }

        // Устанавливаем фон в зависимости от погоды
        setWeatherBackground(currentData.weather[0].icon);

        // Отображаем данные
        displayWeather(currentData, forecastData);
        localStorage.setItem('lastCity', city);
        currentCityName = city;
        
    } catch (error) {
        console.error("Ошибка:", error);
        if (elements.cityInput.value.trim()) {
            tg.showAlert(error.message || "Ошибка при получении данных");
        }
    }
}

// Установка фона в зависимости от погоды
function setWeatherBackground(iconCode) {
    const bgImage = weatherBackgrounds[iconCode] || weatherBackgrounds['01d'];
    elements.weatherBg.style.backgroundImage = `url(${bgImage})`;
}

// Отображение погоды
function displayWeather(current, forecast) {
    // Основная информация
    elements.currentCity.textContent = current.name;
    elements.currentTemp.textContent = `${Math.round(current.main.temp)}°`;
    elements.currentCondition.textContent = current.weather[0].description;
    elements.tempMax.textContent = `Макс.: ${Math.round(current.main.temp_max)}°`;
    elements.tempMin.textContent = `Мин.: ${Math.round(current.main.temp_min)}°`;

    // Детали
    elements.humidity.textContent = `${current.main.humidity}%`;
    elements.wind.textContent = `${Math.round(current.wind.speed)} км/ч`;
    elements.feelsLike.textContent = `${Math.round(current.main.feels_like)}°`;
    elements.pressure.textContent = `${Math.round(current.main.pressure * 0.75)} мм`;
    elements.sunrise.textContent = new Date(current.sys.sunrise * 1000).toLocaleTimeString('ru', {timeStyle: 'short'});
    elements.sunset.textContent = new Date(current.sys.sunset * 1000).toLocaleTimeString('ru', {timeStyle: 'short'});
    elements.visibility.textContent = `${current.visibility / 1000} км`;
    
    // УФ-индекс (примерное значение)
    const uvIndex = Math.min(Math.round(current.main.temp / 5), 10);
    elements.uvIndex.textContent = uvIndex;

    // Почасовой прогноз (каждый час на 24 часа)
    const now = new Date();
    const currentHour = now.getHours();
    
    // Фильтруем прогноз, чтобы показать каждый час
    const hourlyData = [];
    for (let i = 0; i < 24; i++) {
        const targetHour = (currentHour + i) % 24;
        const targetTime = new Date(now);
        targetTime.setHours(targetHour, 0, 0, 0);
        
        // Находим ближайший прогноз к этому часу
        const closest = forecast.list.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.dt * 1000) - targetTime);
            const currDiff = Math.abs(new Date(curr.dt * 1000) - targetTime);
            return currDiff < prevDiff ? curr : prev;
        });
        
        hourlyData.push(closest);
    }

    // Отображаем почасовой прогноз
    hourlyData.forEach(hour => {
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="time">${new Date(hour.dt * 1000).getHours()}:00</div>
            <div class="icon">${weatherIcons[hour.weather[0].icon] || '🌤️'}</div>
            <div class="temp">${Math.round(hour.main.temp)}°</div>
        `;
        elements.hourlyForecast.appendChild(hourItem);
    });

    // Дневной прогноз (10 дней)
    const dailyForecast = forecast.list.filter((item, index) => index % 8 === 0);
    dailyForecast.slice(0, 10).forEach(day => {
        const dayItem = document.createElement('div');
        dayItem.className = 'daily-item';
        dayItem.innerHTML = `
            <div class="day">${new Date(day.dt * 1000).toLocaleDateString('ru', { weekday: 'long' })}</div>
            <div class="icon">${weatherIcons[day.weather[0].icon] || '🌤️'}</div>
            <div class="temps">
                <span class="max-temp">${Math.round(day.main.temp_max)}°</span>
                <span class="min-temp">${Math.round(day.main.temp_min)}°</span>
            </div>
        `;
        elements.dailyForecast.appendChild(dayItem);
    });

    // Анимация
    if (window.gsap) {
        gsap.from(".card", {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5
        });
    }
}

// Обработчики событий
elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = elements.cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    }
});

// Загрузка при старте
document.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity') || 'Москва';
    elements.cityInput.value = savedCity;
    fetchWeather(savedCity);
});

// Обработка изменений темы Telegram
tg.onEvent('themeChanged', () => {
    document.body.dataset.theme = tg.colorScheme;
});
