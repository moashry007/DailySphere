// prayer.js
import { qs, qsa } from './ui.js';

let prayerContainer;
let praytime = new PrayTime("MWL"); // default Muslim World League

function renderPrayerTimes(times, date, location) {
  qs("#prayerLocation", prayerContainer).textContent =
    `${location} (${date.toDateString()})`;

  const tbody = qs("#prayerTable tbody", prayerContainer);
  tbody.innerHTML = "";

  Object.entries(times).forEach(([name, time]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${name.toUpperCase()}</td><td>${time}</td>`;
    tbody.appendChild(row);
  });
}

function calculatePrayerTimes(lat, lon, tz, location) {
  const date = new Date();

  // method (MWL, ISNA, Egypt, etc.)
  praytime.method(qs("#methodSelect", prayerContainer).value);

  // format (12h or 24h)
  praytime.format(qs("#formatSelect", prayerContainer).value);

  // rounding (optional – add dropdown if you want)
  praytime.round("nearest");

  // location + timezone
  praytime.location([lat, lon]);
  praytime.utcOffset(tz);

  // adjustments (minutes + Asr + High Lats)
  praytime.adjust({
    fajr: parseInt(qs("#adjFajr", prayerContainer).value) || 0,
    dhuhr: parseInt(qs("#adjDhuhr", prayerContainer).value) || 0,
    asr: qs("#asrSelect", prayerContainer).value, // "Standard" or "Hanafi"
    maghrib: parseInt(qs("#adjMaghrib", prayerContainer).value) || 0,
    isha: parseInt(qs("#adjIsha", prayerContainer).value) || 0,
    highLats: qs("#hlSelect", prayerContainer).value // "None", "MidNight", "OneSeventh", "AngleBased"
  });

  // get prayer times
  const times = praytime.getTimes(date);

  renderPrayerTimes(times, date, location);
}


export function initPrayer(container) {
  prayerContainer = container;
  container.innerHTML = `
    <h1>🕌 Prayer Times</h1>
    <div class="form-group">
      <label for="ddlCountriesPrayer">Country</label>
      <select id="ddlCountriesPrayer"></select>
    </div>
    <div class="form-group">
      <label for="ddlCitiesPrayer">City</label>
      <select id="ddlCitiesPrayer" disabled></select>
    </div>
    <div class="horizontal-inputs">
      <button id="btnPrayerByCity">Get By City</button>
      <button id="btnPrayerByLocation">Use Current Location</button>
    </div>

    <hr>
    <h4>⚙️ Settings</h4>
    <div class="form-group"><label>Method
      <select id="methodSelect">
        <option value="MWL">Muslim World League</option>
        <option value="ISNA">ISNA</option>
        <option value="Egypt">Egypt</option>
        <option value="Makkah">Makkah</option>
        <option value="Karachi">Karachi</option>
        <option value="Tehran">Tehran</option>
        <option value="Jafari">Jafari</option>
      </select>
    </label></div>
    <div class="form-group"><label>Asr Method
      <select id="asrSelect">
        <option value="Standard">Standard</option>
        <option value="Hanafi">Hanafi</option>
      </select>
    </label></div>
    <div class="form-group"><label>High Latitudes
      <select id="hlSelect">
        <option value="None">None</option>
        <option value="MidNight">MidNight</option>
        <option value="OneSeventh">One Seventh</option>
        <option value="AngleBased">AngleBased</option>
      </select>
    </label></div>
    <div class="form-group"><label>Format
      <select id="formatSelect">
        <option value="24h">24 Hour</option>
        <option value="12h">12 Hour</option>
      </select>
    </label></div>

    <h4>🔧 Adjustments (minutes)</h4>
    <div class="horizontal-inputs">
      <input id="adjFajr" type="number" placeholder="Fajr" />
      <input id="adjDhuhr" type="number" placeholder="Dhuhr" />
      <input id="adjAsr" type="number" placeholder="Asr" />
      <input id="adjMaghrib" type="number" placeholder="Maghrib" />
      <input id="adjIsha" type="number" placeholder="Isha" />
    </div>

    <h4 id="prayerLocation"></h4>
    <table id="prayerTable"><tbody></tbody></table>
  `;

  const ddlCountries = qs("#ddlCountriesPrayer", container);
  const ddlCities = qs("#ddlCitiesPrayer", container);

  // Load countries list
  fetch("https://countriesnow.space/api/v0.1/countries")
    .then(res => res.json())
    .then(({ data }) => {
      ddlCountries.innerHTML = "<option value=''>-- Select Country --</option>" +
        data.map(c => `<option value="${c.iso2}">${c.country}</option>`).join('');
      ddlCountries.addEventListener("change", () => {
        const country = data.find(c => c.iso2 === ddlCountries.value);
        ddlCities.innerHTML = "<option value=''>-- Select City --</option>";
        if (country && country.cities) {
          ddlCities.innerHTML += country.cities.map(city => `<option value="${city}">${city}</option>`).join('');
          ddlCities.disabled = false;
        } else {
          ddlCities.disabled = true;
        }
      });
    });

  qs("#btnPrayerByCity", container).addEventListener("click", () => {
    const city = ddlCities.value;
    const country = ddlCountries.value;
    if (city && country) {
      // Use geocode API to resolve lat/lon
      fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(city + "," + country)}`)
        .then(res => res.json())
        .then(geo => {
          if (geo && geo[0]) {
            calculatePrayerTimes(
              parseFloat(geo[0].lat),
              parseFloat(geo[0].lon),
              new Date().getTimezoneOffset() / -60,
              `${city}, ${country}`
            );
          }
        });
    }
  });

  qs("#btnPrayerByLocation", container).addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => calculatePrayerTimes(
        pos.coords.latitude,
        pos.coords.longitude,
        new Date().getTimezoneOffset() / -60,
        "Your Location"
      ),
      err => alert("Geo Error: " + err.message)
    );
  });
}
