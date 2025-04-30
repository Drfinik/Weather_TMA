// Конфигурация
const API_KEY = "0385b4b3574b96a26453f275b7d20a02";
let currentCityName = "Москва";

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы DOM
const elements = {
    cityInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    locationBtn: document.getElementById('location-btn'),
    currentIcon: document.getElementById('current-icon'),
    currentTemp: document.getElementById('current-temp'),
    currentCity: document.getElementById('current-city'),
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
    citySuggestions: document.querySelector('.city-suggestions')
};

// Иконки погоды (обновленные)
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

// Состояния погоды на русском
const weatherConditions = {
    'clear': 'Ясно',
    'clouds': 'Облачно',
    'rain': 'Дождь',
    'thunderstorm': 'Гроза',
    'snow': 'Снег',
    'mist': 'Туман',
    'drizzle': 'Морось'
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

// Скрываем подсказки при клике вне поля
document.addEventListener('click', (e) => {
    if (e.target !== elements.cityInput) {
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

        // Устанавливаем тему (день/ночь)
        const isNight = !currentData.weather[0].icon.includes('d');
        document.body.classList.toggle('night', isNight);

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

// Отображение погоды
function displayWeather(current, forecast) {
    // Основная информация
    elements.currentIcon.textContent = weatherIcons[current.weather[0].icon] || '🌤️';
    elements.currentTemp.textContent = `${Math.round(current.main.temp)}°`;
    elements.currentCity.textContent = current.name;
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

    // Почасовой прогноз (первые 12 часов)
    forecast.list.slice(0, 12).forEach(hour => {
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="time">${new Date(hour.dt * 1000).getHours()}:00</div>
            <div class="icon">${weatherIcons[hour.weather[0].icon] || '🌤️'}</div>
            <div class="temp">${Math.round(hour.main.temp)}°</div>
        `;
        elements.hourlyForecast.appendChild(hourItem);
    });

    // Дневной прогноз (следующие 5 дней)
    const dailyForecast = forecast.list.filter((item, index) => index % 8 === 0);
    dailyForecast.slice(1, 6).forEach(day => {
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
        gsap.from(".weather-card, .daily-forecast, .detail-card", {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5
        });
    }
}

// Обработчики событий
elements.searchBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.searchBtn.click();
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
