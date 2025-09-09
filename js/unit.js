// unit.js

import { el, qs, qsa } from './ui.js';

const categoryIcons = { length: "📏", weight: "⚖️", temperature: "🌡️", storage: "💾", speed: "🏃", time: "⏱️", area: "🟦", volume: "🧊" };
const unitConversions = {
  length: { units: { meter: 1, kilometer: 1000, centimeter: 0.01, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.34 } },
  weight: { units: { kilogram: 1, gram: 0.001, pound: 0.453592, ounce: 0.0283495 } },
  temperature: { formula: (v, f, t) => { if (f === t) return v; if (f === "celsius" && t === "fahrenheit") return v * 9 / 5 + 32; if (f === "fahrenheit" && t === "celsius") return (v - 32) * 5 / 9; if (f === "celsius" && t === "kelvin") return v + 273.15; if (f === "kelvin" && t === "celsius") return v - 273.15; return v; }, units: { celsius: 1, fahrenheit: 1, kelvin: 1 } },
  storage: { units: { bit: 1, byte: 8, kb: 8192, mb: 8388608, gb: 8589934592 } },
  speed: { units: { "m/s": 1, "km/h": 0.277778, mph: 0.44704 } },
  time: { units: { second: 1, minute: 60, hour: 3600, day: 86400 } },
  area: { units: { "sq-meter": 1, "sq-foot": 0.092903, "sq-yard": 0.836127, acre: 4046.86, hectare: 10000 } },
  volume: { units: { "cu-meter": 1, "cu-foot": 0.028317, liter: 0.001, gallon: 0.00378541 } }
};

let unitContainer;

function loadUnitOptions() {
  if (!unitContainer) return;
  const category = qs("#unitCategory", unitContainer).value;
  const units = unitConversions[category].units;
  const optionsHtml = Object.keys(units).map(unit => `<option value="${unit}">${unit}</option>`).join("");
  qs("#unitFrom", unitContainer).innerHTML = optionsHtml;
  qs("#unitTo", unitContainer).innerHTML = optionsHtml;
}

function convertUnit() {
  if (!unitContainer) return;
  const category = qs("#unitCategory", unitContainer).value;
  const fromUnit = qs("#unitFrom", unitContainer).value;
  const toUnit = qs("#unitTo", unitContainer).value;
  const amount = parseFloat(qs("#unitAmount", unitContainer).value);
  const resultEl = qs("#unitResult", unitContainer);
  const outputBox = qs("#unitOut", unitContainer);

  if (isNaN(amount)) {
    resultEl.textContent = "Please enter a valid number.";
    outputBox.classList.remove("hidden");
    return;
  }

  const conv = unitConversions[category];
  let result;
  if (conv.formula) {
    result = conv.formula(amount, fromUnit, toUnit);
  } else {
    const fromBase = amount * conv.units[fromUnit];
    result = fromBase / conv.units[toUnit];
  }

  resultEl.textContent = `${amount} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`;
  outputBox.classList.remove("hidden");
}

function smartConvert() {
  if (!unitContainer) return;
  const input = qs("#smartInput", unitContainer).value.toLowerCase().trim();
  const parts = input.match(/^(\d+(\.\d+)?)\s*([a-zA-Z\/]+)\s+to\s+([a-zA-Z\/]+)$/);
  const resultEl = qs("#smartResult", unitContainer);
  const outputBox = qs("#smartOut", unitContainer);
  outputBox.classList.remove("hidden");

  if (!parts) {
    resultEl.textContent = "Invalid format. Use 'amount from_unit to to_unit' (e.g. 10kg to lb)";
    return;
  }

  const [, amountStr, , fromUnit, toUnit] = parts;
  const amount = parseFloat(amountStr);

  const foundCategory = Object.keys(unitConversions).find(cat => {
    const units = Object.keys(unitConversions[cat].units);
    return units.includes(fromUnit) && units.includes(toUnit);
  });

  if (!foundCategory) {
    resultEl.textContent = `Conversion from ${fromUnit} to ${toUnit} not found.`;
    return;
  }

  const conv = unitConversions[foundCategory];
  let result;
  if (conv.formula) {
    result = conv.formula(amount, fromUnit, toUnit);
  } else {
    const fromBase = amount * conv.units[fromUnit];
    result = fromBase / conv.units[toUnit];
  }

  resultEl.textContent = `${amount} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`;
}

export function initUnit(container) {
  if (!container) return;
  unitContainer = container;

  container.innerHTML = `
    <h1>📐 Unit Converter</h1>
    <section>
      <h4>Standard Converter</h4>
      <div class="form-group">
        <label>Category <select id="unitCategory"></select></label>
      </div>
      <div class="horizontal-inputs">
        <label>From <select id="unitFrom"></select></label>
        <label>To <select id="unitTo"></select></label>
        <label>Amount <input id="unitAmount" type="number" value="1" /></label>
      </div>
      <button id="unitConvertBtn">Convert</button>
      <div id="unitOut" class="output-box hidden"><div id="unitResult"></div></div>
    </section>
    <section>
      <h4>⚡ Smart Input</h4>
      <div class="form-group">
        <input id="smartInput" placeholder="e.g. 10kg to lb" />
      </div>
      <button id="smartConvertBtn">Convert</button>
      <div id="smartOut" class="output-box hidden"><div id="smartResult"></div></div>
    </section>
  `;

  const categoryOptions = Object.keys(unitConversions)
    .map(c => `<option value="${c}">${categoryIcons[c]} ${c}</option>`)
    .join("");
  qs("#unitCategory", unitContainer).innerHTML = categoryOptions;
  
  qs("#unitCategory", unitContainer).addEventListener("change", loadUnitOptions);
  qs("#unitConvertBtn", unitContainer).addEventListener("click", convertUnit);
  qs("#smartConvertBtn", unitContainer).addEventListener("click", smartConvert);

  loadUnitOptions();
}