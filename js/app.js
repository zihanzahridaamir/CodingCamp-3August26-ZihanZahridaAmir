// Expense and Budget Visualizer
// Single-file Vanilla JavaScript application

// ============================================================================
// StorageManager - Handles all localStorage interactions
// ============================================================================
const StorageManager = {
  KEYS: {
    TRANSACTIONS: 'ebv_transactions',
    CATEGORIES: 'ebv_categories',
    LIMITS: 'ebv_limits',
    THEME: 'ebv_theme'
  },

  isAvailable() {
    const probe = '__ebv_probe__';
    try {
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  },

  load(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Silently ignore removal errors
    }
  }
};

// ============================================================================
// AppState - Single in-memory source of truth
// ============================================================================
const AppState = {
  transactions: [],
  categories: [],
  limits: {},
  theme: 'light',
  filter: { month: null },
  sort: null,

  addTransaction(tx) {
    this.transactions.push(tx);
  },

  removeTransaction(id) {
    this.transactions = this.transactions.filter(tx => tx.id !== id);
  },

  addCategory(name) {
    this.categories.push(name);
  },

  setLimit(category, amount) {
    this.limits[category] = amount;
  },

  setFilter(month) {
    this.filter.month = month;
  },

  setSort(option) {
    this.sort = option;
  },

  setTheme(theme) {
    this.theme = theme;
  },

  snapshot() {
    return JSON.parse(JSON.stringify({
      transactions: this.transactions,
      categories: this.categories,
      limits: this.limits,
      theme: this.theme,
      filter: this.filter,
      sort: this.sort
    }));
  },

  rollback(snapshot) {
    this.transactions = snapshot.transactions;
    this.categories = snapshot.categories;
    this.limits = snapshot.limits;
    this.theme = snapshot.theme;
    this.filter = snapshot.filter;
    this.sort = snapshot.sort;
  }
};

// ============================================================================
// TransactionManager - Business logic for transactions
// ============================================================================
const TransactionManager = {
  computeBalance(transactions) {
    const sum = transactions.reduce((acc, tx) => acc + tx.amount, 0);
    return Math.round(sum * 100) / 100;
  },

  filterByMonth(transactions, month) {
    if (!month) {
      return [...transactions];
    }
    return transactions.filter(tx => tx.date.startsWith(month));
  },

  sortTransactions(transactions, option) {
    const copy = [...transactions];
    
    if (!option) {
      return copy.reverse();
    }

    switch (option) {
      case 'amount_asc':
        return copy.sort((a, b) => a.amount - b.amount);
      case 'amount_desc':
        return copy.sort((a, b) => b.amount - a.amount);
      case 'category_asc':
        return copy.sort((a, b) => a.category.localeCompare(b.category));
      case 'category_desc':
        return copy.sort((a, b) => b.category.localeCompare(a.category));
      default:
        return copy;
    }
  },

  groupByCategory(transactions) {
    return transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
  },

  getCategoryOverages(grouped, limits) {
    const overages = [];
    for (const cat of Object.keys(limits)) {
      const total = grouped[cat] || 0;
      if (total > limits[cat]) {
        overages.push({
          category: cat,
          total,
          limit: limits[cat],
          excess: Math.round((total - limits[cat]) * 100) / 100
        });
      }
    }
    return overages;
  },

  buildChartData(grouped, categories) {
    const filteredCats = categories.filter(cat => grouped[cat] > 0);
    return {
      labels: filteredCats,
      values: filteredCats.map(c => grouped[c])
    };
  }
};

// ============================================================================
// CategoryManager - Category validation and management
// ============================================================================
const CategoryManager = {
  DEFAULT_CATEGORIES: ['Food', 'Transport', 'Fun'],

  // Returns true if `name` matches any item in `existing` (case-insensitive)
  isDuplicate(name, existing) {
    const normalized = name.toLowerCase();
    return existing.some(item => item.toLowerCase() === normalized);
  },

  // Returns true if `name` is valid: 1–50 characters after trimming whitespace
  // Duplicate checking is separate (use isDuplicate)
  isValidName(name) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed.length >= 1 && trimmed.length <= 50;
  }
};

// ============================================================================
// Validator - Pure validation functions
// ============================================================================
const Validator = {
  validateItemName(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed.length === 0) {
      return { field: 'name', valid: false, message: 'Item name is required.' };
    }
    if (trimmed.length > 100) {
      return { field: 'name', valid: false, message: 'Item name must be 100 characters or fewer.' };
    }
    return { field: 'name', valid: true, message: null };
  },

  validateAmount(value) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { field: 'amount', valid: false, message: 'Amount must be a number between 0.01 and 999,999,999.99.' };
    }
    if (num < 0.01 || num > 999999999.99) {
      return { field: 'amount', valid: false, message: 'Amount must be between 0.01 and 999,999,999.99.' };
    }
    return { field: 'amount', valid: true, message: null };
  },

  validateTransaction(name, amount, category) {
    const results = [];

    results.push(this.validateItemName(name));
    results.push(this.validateAmount(amount));

    // Category presence check
    if (!category || (typeof category === 'string' && category.trim() === '')) {
      results.push({ field: 'category', valid: false, message: 'Please select a category.' });
    } else {
      results.push({ field: 'category', valid: true, message: null });
    }

    return results;
  },

  validateCategoryName(name, existing) {
    if (!CategoryManager.isValidName(name)) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (trimmed.length === 0) {
        return { field: 'category-name', valid: false, message: 'Category name is required.' };
      }
      return { field: 'category-name', valid: false, message: 'Category name must be between 1 and 50 characters.' };
    }
    if (CategoryManager.isDuplicate(name, existing)) {
      return { field: 'category-name', valid: false, message: `Category "${name.trim()}" already exists.` };
    }
    return { field: 'category-name', valid: true, message: null };
  }
};

// ============================================================================
// UIManager - DOM rendering and manipulation
// ============================================================================
const UIManager = {
  renderTransactionList(transactions, overages) {
    const list = document.getElementById('transaction-list');
    if (!list) return;

    list.innerHTML = '';

    if (transactions.length === 0) {
      this.showEmptyState('transaction-list', 'No transactions recorded yet.');
      return;
    }

    for (const tx of transactions) {
      const isOverLimit = overages.some(o => o.category === tx.category);
      const li = document.createElement('li');
      li.className = 'transaction-item' + (isOverLimit ? ' over-limit' : '');

      li.innerHTML = `
        ${isOverLimit ? '<span class="warning-icon">⚠</span>' : ''}
        <span class="transaction-name">${tx.name}</span>
        <span class="transaction-category">${tx.category}</span>
        <span class="transaction-amount">${this.formatCurrency(tx.amount)}</span>
        <button class="btn-danger delete-btn" data-id="${tx.id}">Delete</button>
      `.trim();

      list.appendChild(li);
    }
  },

  formatCurrency(total) {
    return '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  renderBalance(total, storageAvailable) {
    const el = document.getElementById('balance-display');
    if (!el) return;
    if (storageAvailable === false) {
      el.textContent = '$—';
      el.classList.add('balance-error');
    } else {
      el.textContent = UIManager.formatCurrency(total);
      el.classList.remove('balance-error');
    }
  },

  renderCategoryDropdown(categories) {
    const sel = document.getElementById('category');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">-- Select Category --</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    if (categories.includes(current)) {
      sel.value = current;
    }
  },

  renderSpendingLimits(categories, limits) {
    const container = document.getElementById('spending-limits-container');
    if (!container) return;
    container.innerHTML = '';
    categories.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'spending-limit-row';

      const label = document.createElement('label');
      label.textContent = cat;

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.01';
      input.max = '999999999.99';
      input.step = '0.01';
      input.dataset.category = cat;
      input.value = limits[cat] || '';
      input.placeholder = 'Set limit...';

      row.appendChild(label);
      row.appendChild(input);
      container.appendChild(row);
    });
  },

  renderAlertBanners(overages) {
    const container = document.getElementById('alert-banner-container');
    if (!container) return;
    container.innerHTML = '';
    overages.forEach(overage => {
      const banner = document.createElement('div');
      banner.className = 'alert-banner';
      banner.textContent = `⚠ ${overage.category}: over limit by $${overage.excess.toFixed(2)}`;
      container.appendChild(banner);
    });
  },

  renderMonthFilter(activeMonth) {
    const input = document.getElementById('month-filter');
    if (!input) return;
    input.value = activeMonth || '';
  },

  renderSortControl(activeSort) {
    const sel = document.getElementById('sort-control');
    if (!sel) return;
    sel.value = activeSort || '';
    // Remove active style from all options
    Array.from(sel.options).forEach(o => o.classList.remove('sort-active'));
    // Highlight the currently selected option (if any)
    if (activeSort) {
      const active = Array.from(sel.options).find(o => o.value === activeSort);
      if (active) active.classList.add('sort-active');
    }
  },

  applyTheme(theme) {
    // Setting the attribute is synchronous; CSS transitions on [data-theme] handle the visual fade
    document.documentElement.setAttribute('data-theme', theme);
  },

  showFieldErrors(results) {
    // Map Validator field names to DOM input IDs and error-span data-field values
    const FIELD_MAP = {
      'name':          { inputId: 'item-name',         errorField: 'item-name'    },
      'amount':        { inputId: 'amount',             errorField: 'amount'       },
      'category':      { inputId: 'category',           errorField: 'category'     },
      'category-name': { inputId: 'add-category-input', errorField: 'add-category' }
    };

    results.forEach(result => {
      if (result.valid !== false) return;
      const map = FIELD_MAP[result.field];
      if (!map) return;

      const input = document.getElementById(map.inputId);
      if (input) input.classList.add('is-invalid');

      const errorSpan = document.querySelector(`.error-message[data-field="${map.errorField}"]`);
      if (errorSpan) errorSpan.textContent = result.message;
    });
  },

  clearFieldErrors() {
    // Remove is-invalid from all form inputs
    document.querySelectorAll('input.is-invalid, select.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
    // Clear all inline error message spans
    document.querySelectorAll('.error-message').forEach(span => {
      span.textContent = '';
    });
  },

  showGlobalError(message) {
    const el = document.getElementById('error-message');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
  },

  clearGlobalError() {
    const el = document.getElementById('error-message');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('is-visible');
  },

  showEmptyState(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (el.tagName.toLowerCase() === 'ul') {
      el.innerHTML = `<li class="empty-state">${message}</li>`;
    } else {
      el.innerHTML = `<p class="empty-state">${message}</p>`;
    }
  }
};

// ============================================================================
// ChartManager - Chart.js wrapper
// ============================================================================
const ChartManager = {
  instance: null,
  COLOR_PALETTE: [
    '#4361ee', '#f72585', '#7209b7', '#3a0ca3', '#4cc9f0',
    '#f9c74f', '#90be6d', '#f8961e', '#43aa8b', '#577590'
  ],

  init(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    // Destroy existing instance to avoid canvas reuse errors
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
    this.instance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.label}: $${ctx.parsed.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`
            }
          }
        }
      }
    });
  },

  update(chartData) {
    if (!this.instance) return;
    const { labels, values } = chartData;
    // Cycle through palette when categories exceed palette size (Req 4.3)
    const colors = labels.map((_, i) => this.COLOR_PALETTE[i % this.COLOR_PALETTE.length]);
    this.instance.data.labels = labels;
    this.instance.data.datasets[0].data = values;
    this.instance.data.datasets[0].backgroundColor = colors;
    this.instance.update();
  },

  showEmptyState() {
    // Hide canvas (Req 4.4)
    const canvas = document.getElementById('chart-canvas');
    if (canvas) canvas.style.display = 'none';
    // Show the existing placeholder element in the HTML
    const parent = canvas ? canvas.parentElement : document.querySelector('.chart-container');
    if (!parent) return;
    const existing = parent.querySelector('.chart-empty-state');
    if (existing) {
      existing.style.display = '';
    } else {
      // Fallback: create a placeholder if the static element is absent
      let placeholder = parent.querySelector('.chart-empty-message');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'chart-empty-message';
        placeholder.textContent = 'No spending data to visualize yet.';
        parent.appendChild(placeholder);
      }
      placeholder.style.display = 'flex';
    }
  },

  hideEmptyState() {
    // Show canvas again
    const canvas = document.getElementById('chart-canvas');
    if (canvas) canvas.style.display = '';
    const parent = canvas ? canvas.parentElement : document.querySelector('.chart-container');
    if (!parent) return;
    // Hide the static placeholder
    const existing = parent.querySelector('.chart-empty-state');
    if (existing) existing.style.display = 'none';
    // Also hide any JS-created placeholder
    const dynamic = parent.querySelector('.chart-empty-message');
    if (dynamic) dynamic.style.display = 'none';
  }
};

// ============================================================================
// App - Main application controller
// ============================================================================
const App = {
  init() {
    // TODO: Initialize application
  }
};

// ============================================================================
// Application Entry Point
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
