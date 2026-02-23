const API_BASE = "https://api.metals.dev/v1/latest";

const dom = {
  apiKeyInput: document.getElementById("apiKey"),
  startButton: document.getElementById("startButton"),
  currencySelect: document.getElementById("currency"),
  refreshIntervalInput: document.getElementById("refreshInterval"),
  statusText: document.getElementById("statusText"),
  lastUpdated: document.getElementById("lastUpdated"),

  goldPrice: document.getElementById("goldPrice"),
  goldCurrency: document.getElementById("goldCurrency"),
  goldChange: document.getElementById("goldChange"),
  goldLbmaAm: document.getElementById("goldLbmaAm"),
  goldLbmaPm: document.getElementById("goldLbmaPm"),
  goldMcx: document.getElementById("goldMcx"),
  goldIbja: document.getElementById("goldIbja"),

  silverPrice: document.getElementById("silverPrice"),
  silverCurrency: document.getElementById("silverCurrency"),
  silverChange: document.getElementById("silverChange"),
  silverLbma: document.getElementById("silverLbma"),
  silverMcx: document.getElementById("silverMcx"),
};

let timerId = null;
let previousPrices = {
  gold: null,
  silver: null,
};

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "--";
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toFixed(3);
}

function setStatus(message, { isError = false } = {}) {
  dom.statusText.textContent = message;
  dom.statusText.style.backgroundColor = isError
    ? "rgba(190, 24, 93, 0.25)"
    : "rgba(15, 118, 110, 0.2)";
  dom.statusText.style.color = isError ? "#fecaca" : "#6ee7b7";
}

function updatePriceChange(element, current, previous) {
  element.classList.remove("positive", "negative", "neutral");

  if (previous == null || current == null) {
    element.textContent = "变化: --";
    element.classList.add("neutral");
    return;
  }

  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : 0;

  let prefix = "";
  if (diff > 0) {
    element.classList.add("positive");
    prefix = "↑";
  } else if (diff < 0) {
    element.classList.add("negative");
    prefix = "↓";
  } else {
    element.classList.add("neutral");
  }

  element.textContent = `${prefix} ${diff >= 0 ? "+" : ""}${diff.toFixed(3)} (${pct >= 0 ? "+" : ""}${pct.toFixed(
    2
  )}%)`;
}

async function fetchLatest() {
  const apiKey = dom.apiKeyInput.value.trim();
  const currency = dom.currencySelect.value;

  if (!apiKey) {
    setStatus("请先填写 Metals.Dev API Key。", { isError: true });
    return;
  }

  const url = `${API_BASE}?api_key=${encodeURIComponent(apiKey)}&currency=${encodeURIComponent(
    currency
  )}&unit=toz`;

  try {
    setStatus("请求中...");
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok || data.status !== "success") {
      const msg = data.error_message || `请求失败，HTTP ${res.status}`;
      setStatus(msg, { isError: true });
      return;
    }

    const { metals, currency: responseCurrency, unit, timestamp } = data;

    // 黄金
    const goldSpot = metals?.gold ?? null;
    dom.goldPrice.textContent = formatNumber(goldSpot);
    dom.goldCurrency.textContent = responseCurrency || currency;
    dom.goldLbmaAm.textContent = formatNumber(metals?.lbma_gold_am);
    dom.goldLbmaPm.textContent = formatNumber(metals?.lbma_gold_pm);
    dom.goldMcx.textContent = formatNumber(metals?.mcx_gold);
    dom.goldIbja.textContent = formatNumber(metals?.ibja_gold);
    updatePriceChange(dom.goldChange, goldSpot, previousPrices.gold);
    previousPrices.gold = goldSpot;

    // 白银
    const silverSpot = metals?.silver ?? null;
    dom.silverPrice.textContent = formatNumber(silverSpot);
    dom.silverCurrency.textContent = responseCurrency || currency;
    dom.silverLbma.textContent = formatNumber(metals?.lbma_silver);
    dom.silverMcx.textContent = formatNumber(metals?.mcx_silver);
    updatePriceChange(dom.silverChange, silverSpot, previousPrices.silver);
    previousPrices.silver = silverSpot;

    const ts = timestamp ? new Date(timestamp) : new Date();
    dom.lastUpdated.textContent = `数据时间：${ts.toLocaleString()}`;

    setStatus(`已更新（单位：${unit || "toz"}）`);
  } catch (err) {
    console.error(err);
    setStatus("请求出错，请检查网络或 API Key。", { isError: true });
  }
}

function startPolling() {
  const intervalSec = Number(dom.refreshIntervalInput.value || "10");
  const safeInterval = Number.isFinite(intervalSec) ? Math.min(Math.max(intervalSec, 3), 300) : 10;
  dom.refreshIntervalInput.value = safeInterval;

  if (timerId) {
    clearInterval(timerId);
  }

  // 立即请求一次
  fetchLatest();
  timerId = setInterval(fetchLatest, safeInterval * 1000);
  setStatus("正在实时获取...");
}

dom.startButton.addEventListener("click", () => {
  startPolling();
});

dom.currencySelect.addEventListener("change", () => {
  if (timerId) {
    fetchLatest();
  }
});

window.addEventListener("beforeunload", () => {
  if (timerId) {
    clearInterval(timerId);
  }
});

