const apiKey = "664843b75302a2643f31ee9c81ced69b"; // Ganti dengan API key OpenWeatherMap kamu

const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const favBtn = document.getElementById("fav-btn");
const unitToggle = document.getElementById("unit-toggle");
const themeToggle = document.getElementById("theme-toggle");

const weatherIcon = document.getElementById("weather-icon");
const tempDiv = document.getElementById("temp-div");
const weatherInfo = document.getElementById("weather-info");
const hourlyForecastDiv = document.getElementById("hourly-forecast");
const dailyForecastDiv = document.getElementById("daily-forecast");
const favoritesList = document.getElementById("favorites");
const loading = document.getElementById("loading");
const errorDiv = document.getElementById("error");
const datalist = document.getElementById("recent-searches");

let unit = localStorage.getItem("unit") || "metric"; // metric or imperial
let theme = localStorage.getItem("theme") || "dark";
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let recentSearches = JSON.parse(localStorage.getItem("recent")) || [];

init();

function init() {
  // Apply saved theme
  if (theme === "light") document.body.classList.add("light");
  themeToggle.checked = theme === "light";

  // Apply saved unit
  unitToggle.checked = unit === "imperial";

  renderFavorites();
  renderRecentSearches();

  // Event listeners
  searchBtn.addEventListener("click", () => getWeather(cityInput.value));
  favBtn.addEventListener("click", addFavorite);
  unitToggle.addEventListener("change", toggleUnit);
  themeToggle.addEventListener("change", toggleTheme);

  // Try geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        getWeatherByCoords(latitude, longitude);
      },
      () => {
        if (recentSearches.length > 0) getWeather(recentSearches[0]);
      }
    );
  }
}

function showLoading(show) {
  loading.classList.toggle("hidden", !show);
}

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");
  setTimeout(() => errorDiv.classList.add("hidden"), 3000);
}

function getWeather(city) {
  if (!city) return;
  showLoading(true);

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${unit}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${unit}`;

  Promise.all([fetch(currentUrl), fetch(forecastUrl)])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([current, forecast]) => {
      if (current.cod !== 200) throw new Error(current.message);
      displayWeather(current);
      displayHourly(forecast.list);
      displayDaily(forecast.list);
      saveRecent(city);
    })
    .catch(err => showError(err.message))
    .finally(() => showLoading(false));
}

function getWeatherByCoords(lat, lon) {
  showLoading(true);
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`;

  Promise.all([fetch(currentUrl), fetch(forecastUrl)])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([current, forecast]) => {
      displayWeather(current);
      displayHourly(forecast.list);
      displayDaily(forecast.list);
    })
    .catch(err => showError(err.message))
    .finally(() => showLoading(false));
}

function displayWeather(data) {
  const temp = Math.round(data.main.temp);
  const feels = Math.round(data.main.feels_like);
  const humidity = data.main.humidity;
  const wind = data.wind.speed;
  const city = data.name;
  const country = data.sys.country;
  const description = data.weather[0].description;
  const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;

  tempDiv.innerHTML = `<p>${temp}°${unit === "metric" ? "C" : "F"}</p>`;
  weatherInfo.innerHTML = `
    <p>${city}, ${country}</p>
    <p>${description}</p>
    <p>Feels like: ${feels}°</p>
    <p>Humidity: ${humidity}% | Wind: ${wind}${unit === "metric" ? " m/s" : " mph"}</p>
  `;
  weatherIcon.src = iconUrl;
  weatherIcon.style.display = "block";
}

function displayHourly(list) {
  hourlyForecastDiv.innerHTML = "";
  list.slice(0, 8).forEach(item => {
    const dt = new Date(item.dt * 1000);
    const hour = dt.getHours().toString().padStart(2, "0");
    const temp = Math.round(item.main.temp);
    const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
    const el = document.createElement("div");
    el.className = "hourly-item";
    el.innerHTML = `<span>${hour}:00</span><img src="${icon}"><span>${temp}°</span>`;
    hourlyForecastDiv.appendChild(el);
  });
}

function displayDaily(list) {
  dailyForecastDiv.innerHTML = "";
  const days = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000).toDateString();
    if (!days[date]) days[date] = [];
    days[date].push(item.main.temp);
  });

  Object.keys(days).slice(0, 5).forEach(date => {
    const temps = days[date];
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const el = document.createElement("div");
    el.className = "daily-item";
    el.innerHTML = `<strong>${date.slice(0, 10)}</strong><p>${min}° / ${max}°</p>`;
    el.addEventListener("click", () => alert(`Details for ${date}`));
    dailyForecastDiv.appendChild(el);
  });
}

function addFavorite() {
  const city = weatherInfo.querySelector("p")?.textContent.split(",")[0];
  if (city && !favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
  }
}

function renderFavorites() {
  favoritesList.innerHTML = "";
  favorites.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => getWeather(city));
    favoritesList.appendChild(li);
  });
}

function saveRecent(city) {
  if (!recentSearches.includes(city)) {
    recentSearches.unshift(city);
    if (recentSearches.length > 5) recentSearches.pop();
    localStorage.setItem("recent", JSON.stringify(recentSearches));
    renderRecentSearches();
  }
}

function renderRecentSearches() {
  datalist.innerHTML = "";
  recentSearches.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    datalist.appendChild(opt);
  });
}

function toggleUnit() {
  unit = unitToggle.checked ? "imperial" : "metric";
  localStorage.setItem("unit", unit);
  if (cityInput.value) getWeather(cityInput.value);
}

function toggleTheme() {
  theme = themeToggle.checked ? "light" : "dark";
  localStorage.setItem("theme", theme);
  document.body.classList.toggle("light");
}
