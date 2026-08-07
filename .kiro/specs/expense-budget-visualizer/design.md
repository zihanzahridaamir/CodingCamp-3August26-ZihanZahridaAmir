# Design Document: Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a single-page, client-side web application built with plain HTML, CSS, and Vanilla JavaScript. It requires no build tool, no backend server, and no JavaScript framework — users open `index.html` directly in a browser.

All persistent state lives in the browser's `localStorage` API, serialized as JSON under fixed key names. The pie chart is rendered using [Chart.js v4](https://www.chartjs.org/) loaded from a CDN. The rest of the rendering and interactivity is implemented in a single application file, `js/app.js`.

The design priority is simplicity and correctness: a flat, well-structured state object is the single source of truth, and every user action updates state first, then persists to localStorage, then updates the UI. This order guarantees that the UI always reflects what is actually saved.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Vanilla JS module pattern (IIFEs / object literals) | Enforces separation of concerns without a build step or bundler |
| Write-then-render order for all mutations | Prevents UI showing state that failed to persist |
| In-memory fallback when localStorage is unavailable | App remains usable per Requirement 5.6; data is simply not persisted |
| Chart.js `chart.data` mutation + `chart.update()` | Avoids destroying/recreating the Chart instance on every render, preserving animations |
| ISO 8601 date strings stored per transaction | Makes month/year filtering purely string-comparable; avoids timezone edge cases in serialization |

---

## Architecture

The application follows a layered architecture within a single JavaScript file. Logical separation is enforced through the module pattern — each module is an object literal or IIFE with a clearly defined interface.

```
┌────────────────────────────────────────────────────────────────┐
│                          index.html                            │
│   Declares DOM skeleton, links css/styles.css, Chart.js CDN,  │
│   and js/app.js (deferred)                                     │
└───────────────────────────┬────────────────────────────────────┘
                            │ DOM ready
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                         js/app.js                              │
│                                                                │
│  ┌──────────────────┐   ┌──────────────────┐                  │
│  │  StorageManager  │   │  AppState        │                  │
│  │  (persistence)   │◄──│  (in-memory      │                  │
│  └──────────────────┘   │   source of      │                  │
│                          │   truth)         │                  │
│  ┌──────────────────┐   └────────┬─────────┘                  │
│  │ TransactionMgr   │            │ read/write                  │
│  │ (business logic) │◄───────────┤                            │
│  └──────────────────┘            │                            │
│                                  │                            │
│  ┌──────────────────┐            │                            │
│  │  CategoryMgr     │◄───────────┤                            │
│  │ (category logic) │            │                            │
│  └──────────────────┘            │                            │
│                                  ▼                            │
│  ┌──────────────────┐   ┌────────────────────────────────┐   │
│  │   UIManager      │   │      ChartManager              │   │
│  │  (DOM rendering) │   │  (Chart.js wrapper)            │   │
│  └──────────────────┘   └────────────────────────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                     Validator                            │ │
│  │              (pure validation functions)                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow for a Transaction Addition

```
User fills form → Validator.validateTransaction()
                        │
            ┌───────────┴─────────────┐
          FAIL                      PASS
            │                        │
    UIManager.showErrors()   AppState.addTransaction()
                                      │
                             StorageManager.save()
                                      │
                          ┌───────────┴────────────┐
                        FAIL                     SUCCESS
                          │                        │
                UIManager.showError()      UIManager.renderAll()
                AppState.rollback()        ChartManager.update()
```

---

## Components and Interfaces

### HTML Components (index.html)

| Element ID | Type | Purpose |
|---|---|---|
| `#input-form` | `<form>` | Transaction entry form |
| `#item-name` | `<input type="text">` | Item name field |
| `#amount` | `<input type="number">` | Amount field |
| `#category` | `<select>` | Category dropdown |
| `#add-category-input` | `<input type="text">` | New custom category name |
| `#add-category-btn` | `<button>` | Adds custom category |
| `#transaction-list` | `<ul>` | Scrollable transaction list |
| `#balance-display` | `<span>` | Running total |
| `#chart-canvas` | `<canvas>` | Chart.js render target |
| `#month-filter` | `<input type="month">` | Monthly filter control |
| `#sort-control` | `<select>` | Sort order selector |
| `#theme-toggle` | `<button>` | Dark/light mode toggle |
| `#spending-limits-container` | `<div>` | Per-category limit inputs |
| `#alert-banner-container` | `<div>` | Spending alert banners |
| `#error-message` | `<div>` | Global error messages |

### JavaScript Modules (js/app.js)

#### `StorageManager`

Wraps all localStorage access. Detects unavailability via `try/catch`.

```javascript
StorageManager = {
  KEYS: {
    TRANSACTIONS: 'ebv_transactions',
    CATEGORIES:   'ebv_categories',
    LIMITS:       'ebv_limits',
    THEME:        'ebv_theme'
  },
  isAvailable(): boolean,          // tests localStorage with a probe write
  load(key): any | null,           // JSON.parse(localStorage.getItem(key))
  save(key, value): boolean,       // JSON.stringify + setItem; returns false on error
  remove(key): void
}
```

#### `AppState`

Single mutable object that is the source of truth for all in-memory state.

```javascript
AppState = {
  transactions: Transaction[],     // all recorded transactions
  categories: string[],            // all category names (defaults + custom)
  limits: Record<string, number>,  // category name → spending limit
  theme: 'light' | 'dark',
  filter: { month: string | null },// YYYY-MM format or null for "all"
  sort: SortOption | null,

  // Methods
  addTransaction(tx: Transaction): void,
  removeTransaction(id: string): void,
  addCategory(name: string): void,
  setLimit(category: string, amount: number): void,
  setFilter(month: string | null): void,
  setSort(option: SortOption | null): void,
  setTheme(theme: string): void,
  rollback(snapshot: AppStateSnapshot): void,
  snapshot(): AppStateSnapshot
}
```

#### `TransactionManager`

Contains all business logic for transactions: filtering, sorting, balance computation, and limit checks. All functions are **pure** (no side effects, no DOM access).

```javascript
TransactionManager = {
  computeBalance(transactions: Transaction[]): number,
  filterByMonth(transactions: Transaction[], month: string | null): Transaction[],
  sortTransactions(transactions: Transaction[], option: SortOption | null): Transaction[],
  groupByCategory(transactions: Transaction[]): Record<string, number>,
  getCategoryOverages(
    grouped: Record<string, number>,
    limits: Record<string, number>
  ): Overage[],
  buildChartData(grouped: Record<string, number>, categories: string[]): ChartData
}
```

#### `CategoryManager`

Pure logic for category validation and deduplication.

```javascript
CategoryManager = {
  DEFAULT_CATEGORIES: ['Food', 'Transport', 'Fun'],
  isDuplicate(name: string, existing: string[]): boolean,  // case-insensitive
  isValidName(name: string): boolean                       // 1–50 chars, non-empty after trim
}
```

#### `Validator`

Pure validation functions for form inputs.

```javascript
Validator = {
  validateItemName(value: string): ValidationResult,
  validateAmount(value: string | number): ValidationResult,
  validateTransaction(name: string, amount: string, category: string): ValidationResult[],
  validateCategoryName(name: string, existing: string[]): ValidationResult
}
// ValidationResult = { field: string, valid: boolean, message: string | null }
```

#### `UIManager`

All DOM mutation happens here. No business logic.

```javascript
UIManager = {
  renderTransactionList(transactions: Transaction[], overages: Overage[]): void,
  renderBalance(total: number, storageAvailable: boolean): void,
  renderCategoryDropdown(categories: string[]): void,
  renderSpendingLimits(categories: string[], limits: Record<string, number>): void,
  renderAlertBanners(overages: Overage[]): void,
  renderMonthFilter(activeMonth: string | null): void,
  renderSortControl(activeSort: SortOption | null): void,
  applyTheme(theme: 'light' | 'dark'): void,
  showFieldErrors(results: ValidationResult[]): void,
  clearFieldErrors(): void,
  showGlobalError(message: string): void,
  clearGlobalError(): void,
  showEmptyState(containerId: string, message: string): void
}
```

#### `ChartManager`

Owns the Chart.js instance. Exposes a single `update()` method to avoid recreating the chart on each render.

```javascript
ChartManager = {
  instance: Chart | null,
  COLOR_PALETTE: string[],  // 10+ distinct hex colors, cycling when needed
  init(canvasId: string): void,
  update(chartData: ChartData): void,   // mutates chart.data and calls chart.update()
  showEmptyState(): void,               // hides canvas, shows placeholder message
  hideEmptyState(): void
}
```

---

## Data Models

### `Transaction`

```typescript
interface Transaction {
  id: string;          // crypto.randomUUID() or Date.now().toString()
  name: string;        // 1–100 characters
  amount: number;      // 0.01 – 999999999.99 (stored as float)
  category: string;    // must match a name in AppState.categories
  date: string;        // ISO 8601 date string: "YYYY-MM-DD"
}
```

### `Category`

Categories are stored as a plain `string[]` — no separate Category object is needed. The array always contains the three defaults first, followed by any user-defined categories in insertion order.

```
AppState.categories: string[]
// Example: ["Food", "Transport", "Fun", "Dining Out", "Gym"]
```

### `SpendingLimit`

```typescript
// Stored in AppState.limits and persisted under KEYS.LIMITS
type Limits = Record<string, number>;
// Example: { "Food": 500.00, "Transport": 150.00 }
```

### `Overage`

Computed value (never persisted), returned by `TransactionManager.getCategoryOverages()`.

```typescript
interface Overage {
  category: string;
  total: number;       // actual spending total for the category
  limit: number;       // the set spending limit
  excess: number;      // total - limit, already > 0 by definition
}
```

### `SortOption`

```typescript
type SortOption =
  | 'amount_asc'
  | 'amount_desc'
  | 'category_asc'
  | 'category_desc';
```

### `ChartData`

Passed from `TransactionManager.buildChartData()` to `ChartManager.update()`.

```typescript
interface ChartData {
  labels: string[];    // category names with non-zero totals
  values: number[];    // spending totals, parallel array to labels
}
```

### localStorage Schema

| Key | Type | Content |
|---|---|---|
| `ebv_transactions` | JSON string | `Transaction[]` |
| `ebv_categories` | JSON string | `string[]` (user-defined categories only; defaults are hardcoded) |
| `ebv_limits` | JSON string | `Record<string, number>` |
| `ebv_theme` | JSON string | `"light"` or `"dark"` |

> **Note:** Default categories (Food, Transport, Fun) are not persisted — they are merged with loaded custom categories at init time. This prevents duplication if the hardcoded defaults ever change.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Prework Analysis

**Acceptance Criteria Testing Prework:**

**1.1** WHEN a user submits the Input_Form with all fields populated and a valid positive amount, THE App SHALL add the transaction  
  Thoughts: This is a universal rule about all valid submissions. We can generate random valid transactions and verify the list grows by exactly one.  
  Classification: PROPERTY

**1.3** WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL display an error and prevent addition  
  Thoughts: "Empty" can include whitespace-only strings. We can generate strings composed purely of whitespace and verify they are rejected.  
  Classification: PROPERTY

**1.4** WHEN the user submits an amount that is not between 0.01 and 999,999,999.99, THE Validator SHALL reject it  
  Thoughts: This is a range check. We can generate arbitrary out-of-range numbers and verify rejection, and in-range numbers and verify acceptance.  
  Classification: PROPERTY

**1.5** WHEN a transaction is successfully added, THE Input_Form SHALL reset  
  Thoughts: This is a UI state check following a specific event — testable as an example, not universally varied.  
  Classification: EXAMPLE

**2.3–2.4** Transaction list updates on add/delete  
  Thoughts: Timing/DOM constraints — example-based integration tests.  
  Classification: INTEGRATION

**3.1–3.3** Balance equals arithmetic sum of all transactions  
  Thoughts: This is a mathematical invariant that holds for any set of transactions. We can generate arbitrary transaction sets and verify the computed balance.  
  Classification: PROPERTY

**3.4** Balance is formatted with two decimal places, thousands separator, currency symbol  
  Thoughts: We can generate arbitrary numbers and verify the output string matches the formatting rules.  
  Classification: PROPERTY

**5.4–5.5** Transactions stored as JSON; round-trip preserves all fields  
  Thoughts: This is a classic round-trip serialization property — the best way to validate serialization.  
  Classification: PROPERTY

**6.2–6.3** Category addition: duplicates (case-insensitive) rejected; valid names accepted  
  Thoughts: Case-insensitive duplicate detection applies universally to any pair of strings. We can generate random strings and test deduplication logic.  
  Classification: PROPERTY

**7.2–7.3** Monthly filter returns only transactions in the selected month/year  
  Thoughts: Filtering is a universal property — for any dataset and any month filter, the result set must contain only transactions within that month.  
  Classification: PROPERTY

**8.2–8.4** Sort options produce correctly ordered results  
  Thoughts: Sorting is a universal property — for any transaction list, after sorting by amount or category, the resulting order must satisfy the ordering predicate.  
  Classification: PROPERTY

**9.2–9.4** Spending limit: overage detected when category total > limit; highlight removed when total ≤ limit  
  Thoughts: This is a comparison invariant. For any transaction set and limit value, whether an overage is reported must match the arithmetic comparison.  
  Classification: PROPERTY

**10.1–10.4** Theme toggle and persistence  
  Thoughts: These are configuration/setup checks and specific event responses.  
  Classification: SMOKE / EXAMPLE

**11.1–11.5** Technology constraints  
  Thoughts: These are structural/architectural constraints, not computable runtime properties.  
  Classification: Not testable via PBT

**12.1–12.4** Performance timing bounds  
  Thoughts: Performance constraints require real-environment benchmarks, not property tests.  
  Classification: INTEGRATION / SMOKE

**Property Reflection:**  
After reviewing all identified properties:
- Properties 3.1–3.3 (balance invariant on add + balance invariant on delete) are two faces of the same invariant: "balance always equals the sum of the current transaction set." They consolidate into one property.
- Property for 1.1 (add grows list by 1) overlaps with the balance invariant — both validate that adding works correctly. They are kept separate because one validates the list count and the other validates numerical correctness.
- Properties 6.2 and 6.3 (duplicate rejection and valid name acceptance) are complementary halves of the same deduplication rule. They consolidate into one property.
- Sort correctness for ascending and descending amount are both instances of "sorted by ordering predicate" — consolidate into one property parameterized by sort option.

Final count: **7 properties**.

---

### Property 1: Transaction Serialization Round-Trip

*For any* array of valid `Transaction` objects, serializing the array to a JSON string and then deserializing it SHALL produce an array where each transaction's `id`, `name`, `amount`, `category`, and `date` fields are strictly equal to the originals.

**Validates: Requirements 5.4, 5.5**

---

### Property 2: Balance Equals Sum of Transactions

*For any* non-empty array of `Transaction` objects, `TransactionManager.computeBalance(transactions)` SHALL return a value exactly equal to the arithmetic sum of every transaction's `amount` field, rounded to two decimal places.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 3: Balance Formatting Invariant

*For any* non-negative number `total`, `UIManager.formatCurrency(total)` SHALL return a string that starts with the currency symbol, contains the integer portion with thousands separators, and ends with exactly two decimal digit places.

**Validates: Requirements 3.4**

---

### Property 4: Invalid Amounts Are Rejected

*For any* numeric value `v` where `v < 0.01` or `v > 999,999,999.99`, or for any non-numeric string, `Validator.validateAmount(v)` SHALL return a `ValidationResult` with `valid === false`. Conversely, *for any* value `v` where `0.01 ≤ v ≤ 999,999,999.99`, the validator SHALL return `valid === true`.

**Validates: Requirements 1.4**

---

### Property 5: Whitespace-Only Strings Are Invalid Inputs

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), both `Validator.validateItemName(s)` and `CategoryManager.isValidName(s)` SHALL return `valid === false` and SHALL NOT result in any transaction or category being added to the application state.

**Validates: Requirements 1.3, 6.3**

---

### Property 6: Monthly Filter Containment

*For any* array of `Transaction` objects and *for any* valid `YYYY-MM` month string `m`, `TransactionManager.filterByMonth(transactions, m)` SHALL return only transactions whose `date` field starts with the string `m` (i.e., falls within that calendar month and year), and SHALL return all such transactions without omission.

**Validates: Requirements 7.2, 7.3**

---

### Property 7: Sort Order Correctness

*For any* non-empty array of `Transaction` objects and *for any* `SortOption`, `TransactionManager.sortTransactions(transactions, option)` SHALL return a permutation of the original array such that for every adjacent pair `(a, b)` in the result, the ordering predicate for that option holds: amount ascending means `a.amount ≤ b.amount`; amount descending means `a.amount ≥ b.amount`; category ascending means `a.category.localeCompare(b.category) ≤ 0`; category descending means `a.category.localeCompare(b.category) ≥ 0`.

**Validates: Requirements 8.1, 8.2, 8.3**

---

## Error Handling

All error scenarios produce one of two outcomes: a field-level inline error message, or a global error banner. No error silently swallows a failure.

### Error Categories

| Scenario | Detection | User Feedback | State Effect |
|---|---|---|---|
| Empty/whitespace item name | `Validator.validateItemName` | Inline error on `#item-name` | Transaction not added |
| Amount out of range or non-numeric | `Validator.validateAmount` | Inline error on `#amount` | Transaction not added |
| No category selected | `Validator.validateTransaction` | Inline error on `#category` | Transaction not added |
| Empty/too-long/duplicate category name | `CategoryManager.isValidName` + `isDuplicate` | Inline error on `#add-category-input` | Category not added |
| localStorage unavailable on init | `StorageManager.isAvailable()` | Persistent warning banner | In-memory mode; no persistence |
| localStorage write failure on add | `StorageManager.save()` returns false | Global error; form not reset | `AppState.rollback()` called; no UI update |
| localStorage write failure on delete | `StorageManager.save()` returns false | Global error; transaction retained | `AppState.rollback()` called; no UI update |
| localStorage read failure on init | `try/catch` around `StorageManager.load()` | Warning banner | App starts with empty state |

### Write-Then-Render Contract

All state mutations follow this strict order:

1. Validate inputs (abort on failure with inline errors)
2. Snapshot current `AppState`
3. Mutate `AppState`
4. Call `StorageManager.save()`
5. If save fails → call `AppState.rollback(snapshot)` → show global error → return
6. If save succeeds → call `UIManager.renderAll()` + `ChartManager.update()`

This guarantees the UI never shows state that failed to persist.

### localStorage Unavailability

When `StorageManager.isAvailable()` returns `false` at app initialization:
- A persistent warning banner is shown: "Data cannot be saved. Your changes will be lost when you close this tab."
- `AppState` operates entirely in-memory
- All mutation steps that call `StorageManager.save()` skip the save and proceed directly to the render step

---

## Testing Strategy

### Dual Testing Approach

Testing is split between **example-based unit tests** (concrete scenarios, edge cases, integration checks) and **property-based tests** (universal invariants across generated inputs). Both are necessary: example tests catch concrete bugs and document expected behavior; property tests verify that the logic holds for any input, not just the ones the developer thought of.

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) — the standard property-based testing library for JavaScript. It runs in Node.js without a browser and integrates with any test runner.

**Test runner**: [Vitest](https://vitest.dev/) or Jest — both work with fast-check.

**Minimum iterations**: 100 per property test.

**Tag format for each test:**
```
// Feature: expense-budget-visualizer, Property N: <property_text>
```

Each of the 7 correctness properties maps to exactly one property-based test:

| Property | fast-check Arbitraries | Minimum Iterations |
|---|---|---|
| 1. Serialization round-trip | `fc.array(transactionArb)` | 100 |
| 2. Balance equals sum | `fc.array(transactionArb, { minLength: 1 })` | 100 |
| 3. Balance formatting | `fc.float({ min: 0, max: 999999999.99 })` | 100 |
| 4. Invalid amounts rejected | `fc.float({ max: -0.001 })`, `fc.float({ min: 1e9 })`, `fc.string()` | 100 |
| 5. Whitespace-only strings invalid | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` | 100 |
| 6. Monthly filter containment | `fc.array(transactionArb)`, `fc.string({ pattern: /\d{4}-\d{2}/ })` | 100 |
| 7. Sort order correctness | `fc.array(transactionArb, { minLength: 1 })`, `fc.constantFrom(...sortOptions)` | 100 |

### Unit Tests (Example-Based)

Unit tests cover:

- **Form reset after successful addition** (Req 1.5): Assert all fields are cleared after a successful submit.
- **Empty transaction list message** (Req 2.6): Assert the empty-state message is shown when `AppState.transactions` is empty.
- **Zero balance display** (Req 3.5): Assert `"$0.00"` is shown when the transaction array is empty.
- **Chart empty state** (Req 4.4): Assert placeholder text is shown when there are no transactions.
- **Default categories present on init** (Req 6.1): Assert Food, Transport, Fun are in the dropdown after initialization.
- **Spending limit overage detection** (Req 9.2–9.4): Three concrete examples: at limit (no overage), one penny over (overage), after deletion back below limit (overage removed).
- **Theme applied before render** (Req 10.4): Assert the `data-theme` attribute or CSS class is set before any transaction list DOM node exists.
- **LocalStorage unavailability path** (Req 5.6, 3.6): Mock `localStorage` to throw; assert warning banner appears and app still renders.

### Integration Tests

Integration tests run against a real (or jsdom-simulated) browser environment:

- **Full add-delete cycle**: Add a transaction → verify list, balance, chart → delete it → verify all three reset.
- **Persistence across simulated reload**: Add transactions → serialize `localStorage` state → re-initialize app → verify all data is restored.
- **Monthly filter end-to-end**: Add transactions across three months → select one month → verify only that month's transactions appear.
- **Spending limit alert end-to-end**: Set a limit → add transactions that exceed it → verify red highlighting and banner → delete the overage transaction → verify highlights and banner clear.

### What Is NOT Tested via PBT

| Area | Reason | Alternative |
|---|---|---|
| Chart.js rendering | Tests external library behavior; output is canvas pixels | Visual regression or snapshot tests |
| DOM layout and CSS | Rendering correctness is not a computable pure function | Manual browser testing; accessibility audit |
| Performance timing bounds | Require real browser environment | Lighthouse / performance profiling |
| Theme visual appearance | Luminance checks require rendered color values | Manual testing with contrast checker |
| localStorage availability behavior | Environment-level configuration | Example-based test with localStorage mock |
