// Config
const API_BASE = 'http://localhost:3000';
const STORAGE_KEYS = {
  symbols: 'lmt_subscribed_symbols',
  custom: 'lmt_custom_symbols',
  insights: 'lmt_insights',
  prices: 'lmt_prices',
};
const INSIGHT_EXPIRY_MS = 24 * 60 * 60 * 1000;

// --- localStorage helpers ---
function saveToStorage(key, data) {
  sessionStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveSubscriptions() {
  saveToStorage(STORAGE_KEYS.symbols, Array.from(subscribedSymbols));
  saveToStorage(STORAGE_KEYS.custom, Array.from(customSymbols));
}

function savePrices() {
  saveToStorage(STORAGE_KEYS.prices, priceData);
}

function loadSavedPrices() {
  const saved = loadFromStorage(STORAGE_KEYS.prices);
  if (!saved) return;
  Object.assign(priceData, saved);
}

function saveInsights() {
  saveToStorage(STORAGE_KEYS.insights, insights);
}

function loadSavedInsights() {
  const saved = loadFromStorage(STORAGE_KEYS.insights);
  if (!saved) return;

  const now = Date.now();
  // Only keep insights less than 24 hours old
  saved.forEach((ins) => {
    const age = now - new Date(ins.timestamp).getTime();
    if (age < INSIGHT_EXPIRY_MS) {
      insights.push(ins);
    }
  });

  // Clean up expired from storage
  if (insights.length !== saved.length) {
    saveInsights();
  }
}

// State
const subscribedSymbols = new Set();
const priceData = {};
const insights = [];
const analyzingSymbols = new Set();
const customSymbols = new Set();

// DOM Elements
const statusEl = document.getElementById('connection-status');
const priceBody = document.getElementById('price-body');
const insightsBody = document.getElementById('insights-body');
const eventLog = document.getElementById('event-log');
const symbolButtons = document.getElementById('symbol-buttons');
const searchInput = document.getElementById('custom-symbol');
const searchDropdown = document.getElementById('search-dropdown');

// Socket Connection
const socket = io(API_BASE);

// Connection Events
socket.on('connect', () => {
  statusEl.textContent = 'Connected';
  statusEl.className = 'status-connected';
  addLog('Connected to server', 'info');

  // Re-subscribe saved symbols on connect/reconnect
  if (subscribedSymbols.size > 0) {
    socket.emit('subscribe', { symbols: Array.from(subscribedSymbols) });
    subscribedSymbols.forEach((sym) => fetchInitialQuote(sym));
  }
});

socket.on('disconnect', () => {
  statusEl.textContent = 'Disconnected';
  statusEl.className = 'status-disconnected';
  addLog('Disconnected from server', 'error');
});

socket.on('connected', (data) => {
  addLog(`Server: ${data.message} (id: ${data.clientId})`, 'info');
});

// Subscription Acknowledgement
socket.on('subscribed', (data) => {
  addLog(`Subscribed to: ${data.symbols.join(', ')}`, 'info');
});

socket.on('unsubscribed', (data) => {
  addLog(`Unsubscribed from: ${data.symbols.join(', ')}`, 'info');
});

// Live Price Updates
socket.on('priceUpdate', (data) => {
  const prev = priceData[data.symbol];
  priceData[data.symbol] = {
    price: data.price,
    volume: data.volume,
    timestamp: data.timestamp,
    prevPrice: prev ? prev.price : data.price,
    fromLive: true,
  };
  savePrices();
  renderPrices();
});

// AI News Analyzing
socket.on('newsAnalyzing', (data) => {
  analyzingSymbols.add(data.symbol);
  renderInsights();
  addLog(`Analyzing news for ${data.symbol}...`, 'info');
});

// AI News Insights
socket.on('newsInsight', (data) => {
  analyzingSymbols.delete(data.symbol);
  insights.unshift(data);
  if (insights.length > 20) insights.pop();
  saveInsights();
  renderInsights();
  addLog(`AI Insight received for ${data.symbol}: ${data.sentiment}`, 'insight');
});

// error handling
socket.on('error', (data) => {
  addLog(`Error: ${data.message}`, 'error');
});

// Fetch & Render Default Symbols
async function loadDefaultSymbols() {
  try {
    const res = await fetch(`${API_BASE}/symbols`);
    const symbols = await res.json();
    renderSymbolButtons(symbols);
  } catch (err) {
    addLog('Failed to load default symbols', 'error');
  }
}

function renderSymbolButtons(symbols) {
  symbolButtons.innerHTML = symbols
    .map((s) => {
      const isActive = subscribedSymbols.has(s.symbol.toUpperCase());
      return `<button class="symbol-btn ${isActive ? 'active' : ''}" data-symbol="${s.symbol}" title="${s.description}">${s.symbol}</button>`;
    })
    .join('');

  symbolButtons.querySelectorAll('.symbol-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggleSymbol(btn.dataset.symbol));
  });
}

// Add symbol button if not already in the bar
function ensureSymbolButton(symbol) {
  const upper = symbol.toUpperCase();
  const existing = symbolButtons.querySelector(`[data-symbol="${upper}"]`);
  if (existing) return;

  customSymbols.add(upper);
  const btn = document.createElement('button');
  btn.className = 'symbol-btn';
  btn.dataset.symbol = upper;
  btn.title = upper;
  btn.textContent = upper;
  btn.addEventListener('click', () => toggleSymbol(upper));
  symbolButtons.appendChild(btn);
}

// Subscribe / Unsubscribe Toggle
function toggleSymbol(symbol) {
  const upper = symbol.toUpperCase();
  if (subscribedSymbols.has(upper)) {
    subscribedSymbols.delete(upper);
    socket.emit('unsubscribe', { symbols: [upper] });
    delete priceData[upper];
    savePrices();
    // Remove insights for unsubscribed symbol
    for (let i = insights.length - 1; i >= 0; i--) {
      if (insights[i].symbol === upper) insights.splice(i, 1);
    }
    saveInsights();
    renderPrices();
    renderInsights();
  } else {
    ensureSymbolButton(upper);
    subscribedSymbols.add(upper);
    socket.emit('subscribe', { symbols: [upper] });
    fetchInitialQuote(upper);
  }
  saveSubscriptions();
  updateButtons();
}

// Fetch last known price via REST
async function fetchInitialQuote(symbol) {
  try {
    const res = await fetch(`${API_BASE}/symbols/quote/${encodeURIComponent(symbol)}`);
    const quote = await res.json();
    if (quote.price && !priceData[symbol]?.fromLive) {
      priceData[symbol] = {
        price: quote.price,
        volume: null,
        timestamp: quote.timestamp,
        prevPrice: quote.previousClose,
        fromLive: false,
      };
      savePrices();
      renderPrices();
    }
  } catch (err) {
    addLog(`Failed to fetch quote for ${symbol}`, 'error');
  }
}

function updateButtons() {
  document.querySelectorAll('.symbol-btn').forEach((btn) => {
    const sym = btn.dataset.symbol;
    if (sym) {
      btn.classList.toggle('active', subscribedSymbols.has(sym.toUpperCase()));
    }
  });
}

let searchTimeout;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();

  if (query.length === 0) {
    searchDropdown.innerHTML = '';
    searchDropdown.classList.remove('visible');
    return;
  }

  searchTimeout = setTimeout(() => searchSymbols(query), 300);
});

async function searchSymbols(query) {
  try {
    const res = await fetch(`${API_BASE}/symbols/search?q=${encodeURIComponent(query)}`);
    const results = await res.json();

    if (results.length === 0) {
      searchDropdown.innerHTML = '<div class="search-item no-results">No results found</div>';
    } else {
      searchDropdown.innerHTML = results
        .map((r) => `<div class="search-item" data-symbol="${r.symbol}">
          <span class="search-symbol">${r.symbol}</span>
          <span class="search-desc">${r.description}</span>
        </div>`)
        .join('');

      searchDropdown.querySelectorAll('.search-item[data-symbol]').forEach((item) => {
        item.addEventListener('click', () => {
          toggleSymbol(item.dataset.symbol);
          searchInput.value = '';
          searchDropdown.innerHTML = '';
          searchDropdown.classList.remove('visible');
        });
      });
    }

    searchDropdown.classList.add('visible');
  } catch (err) {
    addLog('Search failed', 'error');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) {
    searchDropdown.innerHTML = '';
    searchDropdown.classList.remove('visible');
  }
});

// Add custom symbol on Enter or Add button
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const symbol = searchInput.value.trim().toUpperCase();
    if (symbol) {
      toggleSymbol(symbol);
      searchInput.value = '';
      searchDropdown.innerHTML = '';
      searchDropdown.classList.remove('visible');
    }
  }
});

document.getElementById('add-custom').addEventListener('click', () => {
  const symbol = searchInput.value.trim().toUpperCase();
  if (symbol) {
    toggleSymbol(symbol);
    searchInput.value = '';
    searchDropdown.innerHTML = '';
    searchDropdown.classList.remove('visible');
  }
});

// Render: Price Table
function renderPrices() {
  const symbols = Object.keys(priceData);
  if (symbols.length === 0) {
    priceBody.innerHTML =
      '<tr><td colspan="4" class="no-data">Subscribe to an asset to see live prices</td></tr>';
    return;
  }

  priceBody.innerHTML = symbols
    .map((sym) => {
      const d = priceData[sym];
      const direction = d.price >= d.prevPrice ? 'price-up' : 'price-down';
      const arrow = d.price >= d.prevPrice ? '+' : '';
      const change = d.price - d.prevPrice;
      const time = new Date(d.timestamp).toLocaleTimeString();

      return `<tr>
        <td class="symbol-cell">${sym}</td>
        <td class="${direction}">$${d.price.toFixed(2)} <small>(${arrow}${change.toFixed(2)})</small></td>
        <td>${d.volume ? d.volume.toLocaleString() : '-'}</td>
        <td style="color:#546e7a">${time}</td>
      </tr>`;
    })
    .join('');
}

// Render: AI Insights
function renderInsights() {
  // Build analyzing cards
  const analyzingHTML = Array.from(analyzingSymbols)
    .map((sym) => `<div class="insight-card analyzing-card">
      <div class="insight-header">
        <span class="insight-symbol">${sym}</span>
        <span class="sentiment-badge sentiment-neutral">analyzing</span>
      </div>
      <div class="analyzing-content">
        <div class="analyzing-spinner"></div>
        <span>AI is analyzing news for ${sym}...</span>
      </div>
    </div>`)
    .join('');

  if (insights.length === 0 && analyzingSymbols.size === 0) {
    insightsBody.innerHTML =
      '<div class="no-data">AI insights will appear here when news is analyzed</div>';
    return;
  }

  const insightsHTML = insights
    .map((ins) => {
      const sentimentClass = `sentiment-${ins.sentiment}`;
      const time = new Date(ins.timestamp).toLocaleString();
      const points = (ins.keyPoints || [])
        .map((p) => `<li>${p}</li>`)
        .join('');

      return `<div class="insight-card">
        <div class="insight-header">
          <span class="insight-symbol">${ins.symbol}</span>
          <span class="sentiment-badge ${sentimentClass}">${ins.sentiment}</span>
        </div>
        <div class="insight-summary">${ins.summary}</div>
        ${points ? `<ul class="insight-points">${points}</ul>` : ''}
        <div class="insight-time">${ins.articleCount} articles analyzed | ${time}</div>
      </div>`;
    })
    .join('');

  insightsBody.innerHTML = analyzingHTML + insightsHTML;
}

function restoreState() {
  // Restore saved insights
  loadSavedInsights();
  if (insights.length > 0) renderInsights();

  // Restore saved prices
  loadSavedPrices();
  if (Object.keys(priceData).length > 0) renderPrices();

  // Restore saved subscriptions
  const savedSymbols = loadFromStorage(STORAGE_KEYS.symbols) || [];
  const savedCustom = loadFromStorage(STORAGE_KEYS.custom) || [];

  // Add custom symbols to Set (buttons will be created after defaults load)
  savedCustom.forEach((s) => customSymbols.add(s));
  savedSymbols.forEach((s) => subscribedSymbols.add(s));
}

async function init() {
  restoreState();
  await loadDefaultSymbols();

  // Create buttons for custom symbols that aren't in defaults
  customSymbols.forEach((sym) => ensureSymbolButton(sym));

  // Mark saved subscriptions as active
  updateButtons();
}

init();
