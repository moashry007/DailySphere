// ui.js

export const el = (id) => document.getElementById(id);
export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => scope.querySelectorAll(selector);

const themeToggleBtn = () => el("themeToggle");
const themeSelect = () => el("themeSelect");

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggleBtn().textContent = "🌞 Theme";
    themeSelect().value = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggleBtn().textContent = "🌙 Theme";
    themeSelect().value = "light";
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", newTheme);
  applyTheme(newTheme);
}

/* Sidebar Navigation */
function setupNavigation() {
  qsa(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("disabled")) return;

      qsa(".menu-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const feature = btn.dataset.feature;
      if (feature) {
        document.dispatchEvent(new CustomEvent("feature-change", { detail: feature }));
      }
    });
  });
}

/* Settings Modal */
const settingsModal = () => el("settingsModal");
const settingsBtn = () => el("settingsBtn");
const saveSettingsBtn = () => el("saveSettings");
const currencyApiKeyInput = () => el("modalCurrencyApiKey");
const themeSelectInput = () => el("themeSelect");

function openModal() {
  currencyApiKeyInput().value = localStorage.getItem("currencyApiKey") || "";
  themeSelectInput().value = localStorage.getItem("theme") || "light";
  settingsModal().classList.remove("hidden");
}

function closeModal() {
  settingsModal().classList.add("hidden");
}

function saveSettings() {
  const apiKey = currencyApiKeyInput().value.trim();
  localStorage.setItem("currencyApiKey", apiKey);
  localStorage.setItem("theme", themeSelectInput().value);
  applyTheme(themeSelectInput().value);
  closeModal();
  document.dispatchEvent(new CustomEvent("settings-updated"));
  alert("Settings saved.");
}

export function initUI() {
  // Theme
  applyTheme(localStorage.getItem("theme") || "light");
  themeToggleBtn().addEventListener("click", toggleTheme);

  // Navigation
  setupNavigation();

  // Settings
  settingsBtn().addEventListener("click", openModal);
  saveSettingsBtn().addEventListener("click", saveSettings);
  qs(".close-btn", settingsModal()).addEventListener("click", closeModal);
  settingsModal().addEventListener("click", (e) => {
    if (e.target === settingsModal()) closeModal();
  });
}