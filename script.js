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

        // Устанавливаем фон
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

// Установка фона
function setWeatherBackground(iconCode) {
    const bgImage = weatherBackgrounds[iconCode] || weatherBackgrounds['01d'];
    elements.weatherBg.style.backgroundImage = `url(${bgImage})`;
}

// Функция интерполяции между двумя значениями
function interpolate(start, end, ratio) {
    return start + (end - start) * ratio;
}

// Отображение погоды с интерполяцией
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

    // Почасовой прогноз с интерполяцией
    const now = new Date();
    const currentHour = now.getHours();
    const currentTime = now.getTime();
    
    // Создаем массив для 24 часов
    elements.hourlyForecast.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const targetHour = (currentHour + i) % 24;
        const targetTime = new Date(now);
        targetTime.setHours(targetHour, 0, 0, 0);
        const targetTimestamp = targetTime.getTime();
        
        // Находим два ближайших прогноза
        let prevForecast = forecast.list[0];
        let nextForecast = forecast.list[forecast.list.length - 1];
        
        for (const item of forecast.list) {
            const itemTime = item.dt * 1000;
            if (itemTime <= targetTimestamp && itemTime > prevForecast.dt * 1000) {
                prevForecast = item;
            }
            if (itemTime >= targetTimestamp && itemTime < nextForecast.dt * 1000) {
                nextForecast = item;
            }
        }
        
        // Рассчитываем коэффициент интерполяции
        const timeDiff = nextForecast.dt * 1000 - prevForecast.dt * 1000;
        const ratio = timeDiff > 0 ? (targetTimestamp - prevForecast.dt * 1000) / timeDiff : 0;
        
        // Интерполируем температуру
        const temp = interpolate(prevForecast.main.temp, nextForecast.main.temp, ratio);
        
        // Выбираем иконку (ближайшую по времени)
        const icon = ratio < 0.5 ? prevForecast.weather[0].icon : nextForecast.weather[0].icon;
        
        // Создаем элемент прогноза
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="time">${targetHour.toString().padStart(2, '0')}:00</div>
            <div class="icon">${weatherIcons[icon] || '🌤️'}</div>
            <div class="temp">${Math.round(temp)}°</div>
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
