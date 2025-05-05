// Конфигурация
const API_KEY = "0385b4b3574b96a26453f275b7d20a02";
let currentCityName = "Москва";

// Проверка среды выполнения
const isTelegram = () => {
    return window.Telegram && Telegram.WebApp && Telegram.WebApp.initData;
};

// Универсальная функция показа сообщений
const showAlert = (message) => {
    if (isTelegram()) {
        Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
};

// Фоновые изображения
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
if (isTelegram()) {
    Telegram.WebApp.expand();
}

// Элементы DOM
const elements = {
    cityInput: document.getElementById('city-input'),
    locationBtn: document.getElementById('location-btn'),
    searchBtn: document.getElementById('search-btn'),
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
    weatherBg: document.getElementById('weather-bg'),
    geoError: document.getElementById('geo-error')
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

// Функция получения геолокации
async function getBrowserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Геолокация не поддерживается вашим браузером"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => resolve(position),
            error => {
                let errorMessage = "Не удалось определить местоположение";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Доступ к геолокации запрещен. Разрешите доступ в настройках браузера";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Информация о местоположении недоступна";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Время ожидания определения местоположения истекло";
                        break;
                }
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// Улучшенная функция определения местоположения
async function getLocation() {
    try {
        if (isTelegram()) {
            return new Promise((resolve, reject) => {
                Telegram.WebApp.showPopup({
                    title: "Доступ к геолокации",
                    message: "Разрешить доступ к вашему местоположению?",
                    buttons: [
                        {id: 'yes', type: 'default', text: 'Разрешить'},
                        {type: 'cancel', text: 'Отмена'}
                    ]
                }, async (buttonId) => {
                    if (buttonId === 'yes') {
                        try {
                            const position = await getBrowserLocation();
                            resolve(position);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error("Доступ к геолокации отклонен"));
                    }
                });
            });
        } else {
            return await getBrowserLocation();
        }
    } catch (error) {
        throw error;
    }
}

// Обработчик кнопки локации
elements.locationBtn.addEventListener('click', async () => {
    try {
        if (elements.geoError) elements.geoError.textContent = '';
        
        const position = await getLocation();
        const { latitude, longitude } = position.coords;
        
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        );
        const locationData = await response.json();
        
        if (locationData.length > 0) {
            const city = locationData[0].name;
            elements.cityInput.value = city;
            await fetchWeather(city);
        } else {
            throw new Error("Не удалось определить город по координатам");
        }
    } catch (error) {
        console.error('Ошибка определения местоположения:', error);
        if (elements.geoError) {
            elements.geoError.textContent = error.message;
            elements.geoError.style.display = 'block';
        } else {
            showAlert(error.message);
        }
    }
});

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

// Загрузка погоды
async function fetchWeather(city) {
    try {
        if (!city) {
            showAlert("Пожалуйста, введите название города");
            return;
        }

        elements.hourlyForecast.innerHTML = '';
        elements.dailyForecast.innerHTML = '';
        
        // Получаем координаты города
        const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
            throw new Error("Город не найден! Попробуйте другой.");
        }
        
        const { lat, lon } = geoData[0];
        
        // Получаем текущую погоду и прогноз
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
        showAlert(error.message || "Ошибка при получении данных");
    }
}

// Установка фона
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
    
    // УФ-индекс
    const uvIndex = Math.min(Math.round(current.main.temp / 5), 10);
    elements.uvIndex.textContent = uvIndex;

    // Почасовой прогноз
    elements.hourlyForecast.innerHTML = '';
    const now = new Date();
    const currentHour = now.getHours();
    
    // Создаем массив для 24 часов
    for (let i = 0; i < 24; i++) {
        const targetHour = (currentHour + i) % 24;
        const targetTime = new Date(now);
        targetTime.setHours(targetHour, 0, 0, 0);
        const targetTimestamp = targetTime.getTime();
        
        // Находим ближайший прогноз
        const closest = forecast.list.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.dt * 1000) - targetTimestamp);
            const currDiff = Math.abs(new Date(curr.dt * 1000) - targetTimestamp);
            return currDiff < prevDiff ? curr : prev;
        });
        
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="time">${targetHour.toString().padStart(2, '0')}:00</div>
            <div class="icon">${weatherIcons[closest.weather[0].icon] || '🌤️'}</div>
            <div class="temp">${Math.round(closest.main.temp)}°</div>
        `;
        elements.hourlyForecast.appendChild(hourItem);
    }

    // Дневной прогноз
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity') || 'Москва';
    elements.cityInput.value = savedCity;
    fetchWeather(savedCity);
});

// Обработка изменений темы Telegram
if (isTelegram()) {
    Telegram.WebApp.onEvent('themeChanged', () => {
        document.body.dataset.theme = Telegram.WebApp.colorScheme;
    });
}
