// main.js

import { initUI, el } from './ui.js';
import { initCurrency } from './currency.js';
import { initUnit } from './unit.js';
import { initWeather } from './weather.js';
import { initTodo } from './todo.js';
import { initPrayer } from './prayer.js';

export const appState = {
  currency: {
    favorites: new Set(JSON.parse(localStorage.getItem("currencyFavorites") || "[]")),
    currentRates: {},
    codeNameMap: {},
    lastFetched: null
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  const mainContent = el("mainContent");

  function loadFeature(feature) {
    mainContent.innerHTML = "";
    let container = document.createElement("div");
    container.classList.add("feature");

    switch (feature) {
      case "currency":
        mainContent.appendChild(container);
        initCurrency(container);
        break;
      case "weather":
        mainContent.appendChild(container);
        initWeather(container);
        break;
      case "prayer":
        mainContent.appendChild(container);
        initPrayer(container);
        break;
      case "unit":
        mainContent.appendChild(container);
        initUnit(container);
        break;
      case "todo":
      default:
        mainContent.appendChild(container);
        initTodo(container); // Pass the container here
        break;
    }
  }

  document.addEventListener("feature-change", (e) => loadFeature(e.detail));
  loadFeature("todo");
  document.querySelector('[data-feature="todo"]').classList.add("active");
});