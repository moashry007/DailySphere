import { el, qs, qsa } from './ui.js';
import { appState } from './main.js';

const BASE_URL = "https://v6.exchangerate-api.com/v6";
let currencyContainer;
let historyChartInstance;

const fmt = (v) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(v);

function cacheIsFresh(lastFetched) {
  return lastFetched && (Date.now() - lastFetched) < (60 * 60 * 1000);
}

async function apiGet(path) {
  const key = (el("modalCurrencyApiKey").value || localStorage.getItem("currencyApiKey") || "").trim();
  if (!key) throw new Error("Please provide a valid API key in Settings.");
  try {
    const res = await fetch(`${BASE_URL}/${key}/${path}`);
    if (!res.ok) {
      const errorJson = await res.json();
      if (errorJson['error-type'] === 'invalid-key') {
        throw new Error(`API Error: Your API key is invalid.`);
      }
      throw new Error(`API failed with status: ${res.status}`);
    }
    const json = await res.json();
    if (json.result !== "success") throw new Error(`API Error: ${json['error-type']}`);
    return json;
  } catch (e) {
    throw new Error(`Failed to fetch: ${e.message}`);
  }
}

function renderRatesTable(rates, filter = '') {
  if (!currencyContainer) return;
  const tbody = qs("#ratesTable tbody", currencyContainer);
  tbody.innerHTML = "";
  const filtered = Object.entries(rates).filter(([code]) => {
    const name = appState.currency.codeNameMap[code] || '';
    return code.toLowerCase().includes(filter) || name.toLowerCase().includes(filter);
  });
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No matching currencies.</td></tr>`;
    return;
  }
  
  const sorted = filtered.sort(([a], [b]) => {
    const isFavA = appState.currency.favorites.has(a);
    const isFavB = appState.currency.favorites.has(b);
    if (isFavA && !isFavB) return -1;
    if (!isFavA && isFavB) return 1;
    return a.localeCompare(b);
  });

  const rowsHtml = sorted.map(([code, rate]) => {
    const isFavorite = appState.currency.favorites.has(code);
    const favBtnText = isFavorite ? '★' : '☆';
    const favLabel = isFavorite ? `Remove ${code} from favorites` : `Add ${code} to favorites`;
    const name = appState.currency.codeNameMap[code] || 'Unknown';
    return `<tr>
      <td>${code}</td>
      <td>${name}</td>
      <td>${fmt(rate)}</td>
      <td><button class="fav-btn" data-code="${code}" aria-label="${favLabel}">${favBtnText}</button></td>
    </tr>`;
  }).join('');
  tbody.innerHTML = rowsHtml;
}

function toggleFavorite(code) {
  appState.currency.favorites.has(code) ? appState.currency.favorites.delete(code) : appState.currency.favorites.add(code);
  localStorage.setItem("currencyFavorites", JSON.stringify(Array.from(appState.currency.favorites)));
  renderRatesTable(appState.currency.currentRates);
}

async function loadCodes() {
  if (cacheIsFresh(appState.currency.lastFetched)) {
    console.log("Using cached currency codes.");
    renderCurrencies();
    return;
  }
  try {
    const { supported_codes } = await apiGet("codes");
    appState.currency.codeNameMap = Object.fromEntries(supported_codes.map(c => [c[0], c[1]]));
    appState.currency.lastFetched = Date.now();
    renderCurrencies();
  } catch (e) {
    alert(`Error: ${e.message}`);
    console.error(e);
  }
}

async function loadLatest(base) {
  try {
    const { conversion_rates } = await apiGet(`latest/${base}`);
    appState.currency.currentRates = conversion_rates;
    renderRatesTable(appState.currency.currentRates);
  } catch (e) {
    alert(`Error: ${e.message}`);
    console.error(e);
  }
}

async function loadHistory(base, target) {
  if (historyChartInstance) historyChartInstance.destroy();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const formatDate = (date) => `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  const start = formatDate(thirtyDaysAgo);
  const end = formatDate(today);

  const url = `time_series/${base}/${target}/${start}/${end}`;

  try {
    const data = await apiGet(url);
    if (!data.rates || Object.keys(data.rates).length === 0) throw new Error("No historical data available for this pair.");

    const labels = Object.keys(data.rates);
    const chartData = Object.values(data.rates).map(rates => rates[target]);

    historyChartInstance = new Chart(qs("#historyChart", currencyContainer).getContext("2d"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `${base} to ${target} over the last 30 days`,
          data: chartData,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false }
        }
      }
    });
  } catch (e) {
    alert(`Error fetching history: ${e.message}`);
    console.error(e);
  }
}

function renderCurrencies() {
  if (!currencyContainer) return;
  const selectHtml = Object.keys(appState.currency.codeNameMap)
    .sort()
    .map(c => `<option value="${c}">${c} - ${appState.currency.codeNameMap[c]}</option>`)
    .join('');
  qs("#baseSelect", currencyContainer).innerHTML = selectHtml;
  qs("#fromCur", currencyContainer).innerHTML = selectHtml;
  qs("#toCur", currencyContainer).innerHTML = selectHtml;
  qs("#historyFromCur", currencyContainer).innerHTML = selectHtml;
  qs("#historyToCur", currencyContainer).innerHTML = selectHtml;
}

function convertPair() {
  if (!currencyContainer) return;
  const fromCode = qs("#fromCur", currencyContainer).value;
  const toCode = qs("#toCur", currencyContainer).value;
  const amount = qs("#amountCur", currencyContainer).value;

  if (fromCode && toCode && amount > 0) {
    if (appState.currency.currentRates[fromCode] && appState.currency.currentRates[toCode]) {
      const rateFrom = appState.currency.currentRates[fromCode];
      const rateTo = appState.currency.currentRates[toCode];
      const result = (amount / rateFrom) * rateTo;
      const outputEl = qs("#outputPair", currencyContainer);
      outputEl.innerHTML = `<strong>${fmt(amount)}</strong> ${fromCode} = <strong>${fmt(result)}</strong> ${toCode}`;
      outputEl.classList.remove("hidden");
    } else {
      qs("#outputPair", currencyContainer).innerHTML = `<p class="error">Please select valid currencies.</p>`;
    }
  } else {
    qs("#outputPair", currencyContainer).classList.add("hidden");
  }
}

export function initCurrency(container) {
  currencyContainer = container;
  
  container.innerHTML = `
    <h1>💱 Currency Converter</h1>
    <section>
      <ul class="tabs">
        <li><button class="tab-btn active" data-tab="pair">Pair</button></li>
        <li><button class="tab-btn" data-tab="all-rates">All Rates</button></li>
        <li><button class="tab-btn" data-tab="history">History</button></li>
      </ul>
      <div id="tab-pair" class="tab-content">
        <div class="horizontal-inputs">
          <label>From <select id="fromCur"></select></label>
          <label>To <select id="toCur"></select></label>
          <button id="swapBtn" aria-label="Swap currencies">⇄</button>
        </div>
        <div class="form-group">
          <label>Amount</label>
          <input id="amountCur" type="number" value="1" />
        </div>
        <div class="output-box hidden" id="outputPair"></div>
      </div>
      <div id="tab-all-rates" class="tab-content hidden">
        <div class="form-group">
          <label>Base Currency <select id="baseSelect"></select></label>
        </div>
        <div class="form-group">
          <input id="searchRates" placeholder="Search by code or name..." />
        </div>
        <table id="ratesTable"><tbody></tbody></table>
      </div>
      <div id="tab-history" class="tab-content hidden">
        <div class="horizontal-inputs">
          <label>From <select id="historyFromCur"></select></label>
          <label>To <select id="historyToCur"></select></label>
          <button id="getHistoryBtn">Get History</button>
        </div>
        <canvas id="historyChart"></canvas>
      </div>
    </section>
  `;

  const fromCur = qs("#fromCur", container);
  const toCur = qs("#toCur", container);
  const swapBtn = qs("#swapBtn", container);
  const amountCur = qs("#amountCur", container);
  const searchRates = qs("#searchRates", container);
  const ratesTable = qs("#ratesTable", container);
  const historyFromCur = qs("#historyFromCur", container);
  const historyToCur = qs("#historyToCur", container);
  const getHistoryBtn = qs("#getHistoryBtn", container);

  qsa(".tab-btn", container).forEach(btn => {
    btn.addEventListener("click", () => {
      qsa(".tab-btn", container).forEach(b => b.classList.remove("active"));
      qsa(".tab-content", container).forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      qs(`#tab-${tab}`, container).classList.remove("hidden");
    });
  });

  qs("#baseSelect", container).addEventListener("change", e => loadLatest(e.target.value));
  amountCur.addEventListener("input", convertPair);
  fromCur.addEventListener("change", convertPair);
  toCur.addEventListener("change", convertPair);
  swapBtn.addEventListener("click", () => {
    const f = fromCur.value;
    fromCur.value = toCur.value;
    toCur.value = f;
    convertPair();
  });
  searchRates.addEventListener("input", () => renderRatesTable(appState.currency.currentRates, searchRates.value.toLowerCase()));
  ratesTable.addEventListener("click", e => {
    if (e.target.matches(".fav-btn")) toggleFavorite(e.target.dataset.code);
  });
  getHistoryBtn.addEventListener("click", () => loadHistory(historyFromCur.value, historyToCur.value));

  loadCodes();
  loadLatest("USD");
  fromCur.value = "USD";
  toCur.value = "EUR";
  convertPair();
}