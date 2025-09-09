// weather.js

import { el, qs, qsa } from './ui.js';
import { appState } from './main.js';

const COUNTRIES_API = "https://countriesnow.space/api/v0.1/countries";
const GEOCODE_API = "https://geocode.maps.co/search?q=";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const weatherIcons = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 61: "🌦️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 75: "❄️", 95: "⛈️" };

let countriesData = [];
let hourlyChartInstance;
let weatherContainer;

function displayError(message) {
  if (weatherContainer) {
    const errorEl = qs("#weatherError", weatherContainer);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
  }
}

async function fetchData(url) {
  try {
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch from ${url}`);
    return res.json();
  } catch (e) {
    displayError(`Network error: ${e.message}`);
    throw e;
  }
}

async function loadCountries() {
  if (!weatherContainer) return;
  try {
    const { data } = await fetchData(COUNTRIES_API);
    
    countriesData = data;
    const ddlCountries = qs("#ddlCountries", weatherContainer);
    ddlCountries.innerHTML = "<option value=''>-- Select Country --</option>" +
      data.map(c => `<option value="${c.iso2}">${c.country}</option>`).join('');
  } catch (e) {
    displayError("Failed to load countries.");
    console.error("Failed to load countries:", e);
  }
}

function handleCountryChange() {
    
  if (!weatherContainer) return;
  const selectedCountry = qs("#ddlCountries", weatherContainer).value;
  const citiesDdl = qs("#ddlCities", weatherContainer);
  citiesDdl.innerHTML = "<option value=''>-- Select City --</option>";
  qs("#btnGetWeather", weatherContainer).disabled = true;

  if (selectedCountry) {
    const country = countriesData.find(c => c.iso2 === selectedCountry);
    if (country && country.cities) {
      citiesDdl.innerHTML += country.cities.map(city => `<option value="${city}">${city}</option>`).join('');
    }
    citiesDdl.disabled = false;
  } else {
    citiesDdl.disabled = true;
  }
}

function renderWeather(data, location) {
    
  if (!weatherContainer) return;
  //qs("#weatherLocation", weatherContainer).textContent = location;
  const current = data.current;
  const current_units= data.current_units;

  qs("#highlightCard", weatherContainer).innerHTML = `
    <h2>${weatherIcons[current.weather_code] || "❓"} ${location} (${current.is_day ? "Day" : "Night"})</h2>
    <p class="temp">${Math.round(current.temperature_2m)}<span class="feels-like">${current_units.temperature_2m}</span></p>
    <p class="feels-like">Feels like ${Math.round(current.apparent_temperature)}${current_units.apparent_temperature}</p>`;


  const currentHTML = `
    <div class="weather-card"><h4>Wind Speed</h4><p>${current.wind_speed_10m} ${current_units.wind_speed_10m}</p></div>
    <div class="weather-card"><h4>Wind Gusts</h4><p>${current.wind_gusts_10m} ${current_units.wind_gusts_10m}</p></div>
    <div class="weather-card"><h4>Humidity</h4><p>${current.relative_humidity_2m}${current_units.relative_humidity_2m}</p></div>
    <div class="weather-card"><h4>Precipitation</h4><p>${current.precipitation} ${current_units.precipitation}</p></div>
    <div class="weather-card"><h4>Cloud Cover</h4><p>${current.cloud_cover}${current_units.cloud_cover}</p></div>
    <div class="weather-card"><h4>Pressure</h4><p>${current.pressure_msl} ${current_units.pressure_msl}</p></div>
    <div class="weather-card"><h4>Wind Direction</h4><p>${current.wind_direction_10m}${current_units.wind_direction_10m}</p></div>
    <div class="weather-card"><h4>Rain</h4><p>${current.rain} ${current_units.rain}</p></div>
    <div class="weather-card"><h4>Snowfall</h4><p>${current.snowfall} ${current_units.snowfall}</p></div>
    `;

  qs("#currentWeather", weatherContainer).innerHTML = currentHTML;
  qs("#currentWeather", weatherContainer).classList.remove("hidden");

}

function renderForecast(daily) {
  if (!weatherContainer) return;
  const forecastEl = qs("#forecastWeather", weatherContainer);
  forecastEl.innerHTML = "";
  debugger
  const forecastDays = daily.time.map((time, index) => ({
    time: time,
    temperature_2m_max: daily.temperature_2m_max[index],
    weather_code: daily.weather_code[index]
  }));
  
  forecastDays.forEach(day => {
    const date = new Date(day.time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const card = document.createElement("div");
    card.classList.add("forecast-card");
    card.innerHTML = `
      <h4>${date}</h4>
      <p class="temp">${Math.round(day.temperature_2m_max)}°C</p>
      <p class="description">${weatherIcons[day.weather_code]} ${getWeatherDescription(day.weather_code)}</p>
    `;
    forecastEl.appendChild(card);
  });
}

function renderHourlyChart(hourly) {
  if (!weatherContainer) return;
  if (hourlyChartInstance) hourlyChartInstance.destroy();
  const canvas = qs("#hourlyChart", weatherContainer);
  const hourlyData = hourly.temperature_2m;
  const hourlyLabels = hourly.time.map(t => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', hour12: true }));

  hourlyChartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: hourlyLabels.slice(0, 24),
      datasets: [{
        label: "Temperature (°C)",
        data: hourlyData.slice(0, 24),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: false } }
    }
  });
}

async function fetchAndDisplayWeather(lat, lon, location) {
  displayError("");
  qs("#currentWeather", weatherContainer).classList.add("hidden");
  qs("#weatherLoader", weatherContainer).classList.remove("hidden");
  qs(".weather-tabs", weatherContainer).classList.remove("hidden");
  qs(".weather-data", weatherContainer).classList.remove("hidden");

  try {
// Define the expanded list of current weather parameters
        const currentParams = [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day",
            "precipitation", "rain", "showers", "snowfall", "weather_code", "cloud_cover",
            "pressure_msl", "surface_pressure", "wind_speed_10m", "wind_direction_10m",
            "wind_gusts_10m"
        ].join(',');

        // Update the URL to include the new parameters and request units
        const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=${currentParams}&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=temperature_2m&timezone=auto`;
            const data = await fetchData(url);
    renderWeather(data, location);
    
    renderForecast(data.daily);
    renderHourlyChart(data.hourly);
  } catch (e) {
    console.error("Weather fetch failed:", e);
    displayError(`Failed to get weather for ${location}.`);
  } finally {
    qs("#weatherLoader", weatherContainer).classList.add("hidden");
  }
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog', 51: 'Drizzle', 53: 'Drizzle',
    55: 'Drizzle', 56: 'Freezing Drizzle', 57: 'Freezing Drizzle',
    61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing Rain',
    67: 'Freezing Rain', 71: 'Snow fall', 73: 'Snow fall',
    75: 'Snow fall', 77: 'Snow grains', 80: 'Rain showers',
    81: 'Rain showers', 82: 'Rain showers', 85: 'Snow showers',
    86: 'Snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail',
    99: 'Thunderstorm with hail'
  };
  return descriptions[code] || "Unknown";
}

export function initWeather(container) {
  if (!container) return;
  weatherContainer = container;

  container.innerHTML = `
    <h1>🌤 Weather</h1>
    <div class="form-group">
      <label for="ddlCountries">Country</label>
      <select id="ddlCountries"></select>
    </div>
    <div class="form-group">
      <label for="ddlCities">City</label>
      <select id="ddlCities" disabled></select>
    </div>
    <div class="horizontal-inputs">
      <button id="btnGetWeather">Get Weather</button>
      <button id="btnCurrentLocation">Use Current Location</button>
    </div>
    
    <div id="weatherError" class="error hidden"></div>
    <div id="weatherLoader" class="loader hidden"></div>
    <div class="weather-data hidden">
     
      <div class="weather-tabs hidden">
        <div class="tabs">
          <button class="tab-btn active" data-tab="currentW">Current</button>
          <button class="tab-btn" data-tab="dailyW">5-Day</button>
          <button class="tab-btn" data-tab="hourlyW">24h</button>
        </div>
        <div id="tab-current" class="tab-content">
        <div id="highlightCard"></div>
          <div id="currentWeather" class="hidden"></div>
        </div>
        <div id="tab-forecast" class="tab-content hidden">
          <div id="forecastWeather" class="forecast-container"></div>
        </div>
        <div id="tab-hourly" class="tab-content hidden">
          <canvas id="hourlyChart"></canvas>
        </div>
      </div>
    </div>
  `;

  const ddlCountries = qs("#ddlCountries", container);
  const ddlCities = qs("#ddlCities", container);
  const btnGetWeather = qs("#btnGetWeather", container);
  const btnCurrentLocation = qs("#btnCurrentLocation", container);
  
  ddlCountries.addEventListener("change", handleCountryChange);
  ddlCities.addEventListener("change", () => {
    btnGetWeather.disabled = !ddlCities.value;
  });
  btnGetWeather.addEventListener("click", async () => {
    const city = ddlCities.value;
    const countryIso = ddlCountries.value;
    try {
      const geo = await fetchData(`${GEOCODE_API}${encodeURIComponent(city + "," + countryIso)}`);
      if (!geo || geo.length === 0) throw new Error("Location not found.");
      const { lat, lon } = geo[0];
      fetchAndDisplayWeather(lat, lon, `${city}, ${ddlCountries.options[ddlCountries.selectedIndex].text}`);
    } catch (e) {
      displayError(`Error: ${e.message}`);
    }
  });
  btnCurrentLocation.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => fetchAndDisplayWeather(pos.coords.latitude, pos.coords.longitude, "Your Location"),
      err => displayError(`Geo Error: ${err.message}`)
    );
  });
  
  qsa(".tab-btn", container).forEach(btn => {
    btn.addEventListener("click", () => {
      qsa(".tab-btn", container).forEach(b => b.classList.remove("active"));
      qsa(".tab-content", container).forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      qs(`#tab-${btn.dataset.tab}`, container).classList.remove("hidden");
    });
  });

  loadCountries();
}