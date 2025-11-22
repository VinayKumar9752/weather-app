
interface WeatherData {
    name: string;
    main: {
        temp: number;
        feels_like: number;
        humidity: number;
        pressure: number;
    };
    weather: Array<{
        main: string;
        description: string;
        icon: string;
    }>;
    wind: {
        speed: number;
    };
}

// API Configuration
const API_KEY = 'f2eb6d91caba047225139db8273669a9'; 
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// DOM Elements - To reference HTML elements in TypeScript
const cityInput = document.getElementById('cityInput') as HTMLInputElement;
const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
const cityName = document.getElementById('cityName') as HTMLHeadingElement;
const date = document.getElementById('date') as HTMLParagraphElement;
const temperature = document.getElementById('temperature') as HTMLSpanElement;
const description = document.getElementById('description') as HTMLParagraphElement;
const weatherIcon = document.getElementById('weatherIcon') as HTMLImageElement;
const feelsLike = document.getElementById('feelsLike') as HTMLSpanElement;
const humidity = document.getElementById('humidity') as HTMLSpanElement;
const windSpeed = document.getElementById('windSpeed') as HTMLSpanElement;
const pressure = document.getElementById('pressure') as HTMLSpanElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;

// Current Date Display Function
function updateDate(): void {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    date.textContent = today.toLocaleDateString('en-US', options);
}

// Fetch Weather Data Function by City Name
// Async function to fetch weather data from API
async function fetchWeatherData(city: string): Promise<WeatherData | null> {
    try {
        // Building URL to make API call
        const url = `${API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=en`;
        
        // Fetching data using Fetch API
        const response = await fetch(url);
        
        // Checking response
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found. Please enter a valid city name.');
            } else if (response.status === 401) {
                // Detailed message for 401 error
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || 'API Key is invalid';
                throw new Error(`API Key Error (401): ${errorMsg}. Please ensure that: 1) API Key is correct, 2) API Key is activated (wait 10-15 min), 3) API Key has no extra spaces.`);
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again after a few minutes.');
            } else {
                throw new Error(`Error fetching weather data (Status: ${response.status}).`);
            }
        }
        
        // Parsing JSON data
        const data: WeatherData = await response.json();
        return data;
    } catch (error) {
        // Error handling
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError('An unknown error occurred.');
        }
        return null;
    }
}

// Fetch Weather Data Function by Coordinates
async function fetchWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData | null> {
    try {
        // Building URL to make API call with coordinates
        const url = `${API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
        
        // Fetching data using Fetch API
        const response = await fetch(url);
        
        // Checking response
        if (!response.ok) {
            if (response.status === 401) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || 'API Key is invalid';
                throw new Error(`API Key Error (401): ${errorMsg}. Please ensure that: 1) API Key is correct, 2) API Key is activated (wait 10-15 min), 3) API Key has no extra spaces.`);
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again after a few minutes.');
            } else {
                throw new Error(`Error fetching weather data (Status: ${response.status}).`);
            }
        }
        
        // Parsing JSON data
        const data: WeatherData = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError('An unknown error occurred.');
        }
        return null;
    }
}

// Reverse Geocoding Function - Get accurate city name from coordinates
async function getCityNameFromCoordinates(lat: number, lon: number): Promise<string | null> {
    try {
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${API_KEY}`;
        
        const response = await fetch(reverseGeoUrl);
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            for (const location of data) {
                // Check if it's a city or town (more specific than district/state)
                if (location.local_names?.en) {
                    // Prefer English name
                    return location.local_names.en;
                } else if (location.name) {
                    // Use the name if available
                    return location.name;
                }
            }
            
            // Fallback to first result
            return data[0].name || data[0].local_names?.en || null;
        }
        
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

// Get Current Location Function
function getCurrentLocation(): void {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    cityName.textContent = 'Getting location...';
    hideError();

    navigator.geolocation.getCurrentPosition(
        // Success callback
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            // Get accurate city name from reverse geocoding first
            cityName.textContent = 'Detecting location...';
            const accurateCityName = await getCityNameFromCoordinates(lat, lon);
            
            // Fetch weather by coordinates (most accurate weather data)
            cityName.textContent = 'Loading weather...';
            const weatherData = await fetchWeatherByCoordinates(lat, lon);
            
            if (weatherData) {
                // Override city name with more accurate reverse geocoded name if available
                // This ensures we show the correct city name even if weather API returns nearby city
                if (accurateCityName && accurateCityName.toLowerCase() !== weatherData.name.toLowerCase()) {
                    // Use reverse geocoded name if it's different (more accurate)
                    weatherData.name = accurateCityName;
                }
                displayWeatherData(weatherData);
            } else {
                cityName.textContent = 'Enter City';
            }
        },
        // Error callback
        (error) => {
            let errorMessage = 'Unable to get your location. ';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Location access denied by user.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    break;
            }
            
            showError(errorMessage);
            cityName.textContent = 'Enter City';
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0 
        }
    );
}

// To display weather data in UI
function displayWeatherData(data: WeatherData): void {
    // Displaying city name
    cityName.textContent = data.name;
    
    temperature.textContent = Math.round(data.main.temp).toString();
    
    // Displaying weather description
    description.textContent = data.weather[0].description;
    
    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = data.weather[0].description;
    
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`; 
    pressure.textContent = `${data.main.pressure} hPa`;
    
    hideError();
}

function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError(): void {
    errorMessage.classList.remove('show');
}

// To fetch weather data when search button is clicked
async function searchWeather(): Promise<void> {
    const city = cityInput.value.trim();
    
    if (!city) {
        showError('Please enter a city name.');
        return;
    }
    
    cityName.textContent = 'Loading...';
    
    // Fetching weather data
    const weatherData = await fetchWeatherData(city);
    
    // Displaying data if successfully fetched
    if (weatherData) {
        displayWeatherData(weatherData);
    } else {
        cityName.textContent = 'Enter City';
    }
}

// Event Listeners
searchBtn.addEventListener('click', searchWeather);

cityInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        searchWeather();
    }
});

updateDate();

setInterval(updateDate, 60000);

getCurrentLocation();

