# Implementation Plan: Expense and Budget Visualizer

## Overview

Implement a client-side, single-page expense tracker using plain HTML, CSS, and Vanilla JavaScript. All state is persisted to `localStorage`. Chart.js is loaded via CDN. The application is organized into seven logical modules inside a single `js/app.js` file: `StorageManager`, `AppState`, `Validator`, `CategoryManager`, `TransactionManager`, `UIManager`, and `ChartManager`. Property-based tests are written with fast-check and Vitest, exercising the seven correctness properties defined in the design.

---

## Tasks

- [x] 1. Project scaffolding
  - [x] 1.1 Create the folder structure and static entry point
    - Create `index.html` with the full DOM skeleton: all element IDs listed in the design (`#input-form`, `#item-name`, `#amount`, `#category`, `#add-category-input`, `#add-category-btn`, `#transaction-list`, `#balance-display`, `#chart-canvas`, `#month-filter`, `#sort-control`, `#theme-toggle`, `#spending-limits-container`, `#alert-banner-container`, `#error-message`)
    - Link `css/styles.css`, the Chart.js v4 CDN script, and `js/app.js` (deferred)
    - Add a `<meta charset>`, viewport meta tag, and a `<title>`
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  - [x] 1.2 Create `css/styles.css` skeleton with CSS custom properties
    - Define `:root` CSS variables for light-mode colors (background, foreground, accent, danger)
    - Define `[data-theme="dark"]` overrides on `:root` for dark-mode colors satisfying the luminance constraints
    - Add base reset styles and layout scaffolding (flexbox or grid)
    - _Requirements: 10.1, 10.5, 11.2_
  - [x] 1.3 Create `js/app.js` skeleton with module stubs
    - Declare all seven module object literals (`StorageManager`, `AppState`, `TransactionManager`, `CategoryManager`, `Validator`, `UIManager`, `ChartManager`) as `const` with empty method stubs
    - Add a `DOMContentLoaded` listener that will call `App.init()` — stub `App.init()` as a no-op for now
    - _Requirements: 11.1, 11.3_

- [x] 2. `StorageManager` module
  - [x] 2.1 Implement `StorageManager` with availability detection and CRUD helpers
    - Implement `isAvailable()` using a probe write inside `try/catch`
    - Implement `load(key)` — `JSON.parse(localStorage.getItem(key))`, returning `null` on error
    - Implement `save(key, value)` — `JSON.stringify` + `setItem`; return `false` on any thrown error, `true` on success
    - Implement `remove(key)`
    - Define the `KEYS` constants: `ebv_transactions`, `ebv_categories`, `ebv_limits`, `ebv_theme`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 3. `AppState` module
  - [x] 3.1 Implement `AppState` as the single in-memory source of truth
    - Initialize fields: `transactions: []`, `categories: []`, `limits: {}`, `theme: 'light'`, `filter: { month: null }`, `sort: null`
    - Implement `addTransaction(tx)`, `removeTransaction(id)`, `addCategory(name)`, `setLimit(category, amount)`, `setFilter(month)`, `setSort(option)`, `setTheme(theme)`
    - Implement `snapshot()` (returns a deep copy of all fields) and `rollback(snapshot)` (restores all fields from snapshot)
    - _Requirements: 1.2, 2.4, 5.1, 5.3, 6.2, 7.1, 8.3, 9.1, 10.2_

- [x] 4. `Validator` and `CategoryManager` modules
  - [x] 4.1 Implement `Validator` pure validation functions
    - Implement `validateItemName(value)` — trims whitespace; valid if length 1–100 after trim; return `{ field, valid, message }`
    - Implement `validateAmount(value)` — coerce to float; valid if 0.01 ≤ value ≤ 999,999,999.99 and not NaN; return `{ field, valid, message }`
    - Implement `validateTransaction(name, amount, category)` — calls both validators plus a category presence check; returns array of `ValidationResult`
    - Implement `validateCategoryName(name, existing)` — delegates to `CategoryManager.isValidName` and `isDuplicate`
    - _Requirements: 1.1, 1.3, 1.4, 6.3_
  - [x]* 4.2 Write property test — Property 4: Invalid amounts are rejected
    - **Property 4: Invalid amounts are rejected**
    - Use `fc.float({ max: 0.009 })` and `fc.float({ min: 1000000000 })` to generate out-of-range values; assert `valid === false`
    - Use `fc.float({ min: 0.01, max: 999999999.99 })` to generate valid values; assert `valid === true`
    - Tag: `// Feature: expense-budget-visualizer, Property 4: Invalid amounts rejected`
    - **Validates: Requirements 1.4**
  - [x]* 4.3 Write property test — Property 5: Whitespace-only strings are invalid
    - **Property 5: Whitespace-only strings are invalid inputs**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 })` to generate whitespace-only strings
    - Assert `Validator.validateItemName(s).valid === false` and `CategoryManager.isValidName(s) === false`
    - Tag: `// Feature: expense-budget-visualizer, Property 5: Whitespace-only strings invalid`
    - **Validates: Requirements 1.3, 6.3**
  - [x] 4.4 Implement `CategoryManager` pure functions
    - Define `DEFAULT_CATEGORIES: ['Food', 'Transport', 'Fun']`
    - Implement `isDuplicate(name, existing)` — case-insensitive comparison against every item in `existing`
    - Implement `isValidName(name)` — trims; valid if 1–50 characters after trim and not a duplicate
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 5. `TransactionManager` module (pure business logic)
  - [x] 5.1 Implement `computeBalance` and `groupByCategory`
    - Implement `computeBalance(transactions)` — `reduce` over `amount` fields; round result to 2 decimal places using `Math.round(sum * 100) / 100`
    - Implement `groupByCategory(transactions)` — returns `Record<string, number>` mapping each category to its summed amounts
    - _Requirements: 3.1, 3.2, 3.3, 4.1_
  - [-]* 5.2 Write property test — Property 2: Balance equals sum of transactions
    - **Property 2: Balance equals sum of transactions**
    - Use a `transactionArb` arbitrary (`fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }), amount: fc.float({ min: 0.01, max: 999999999.99 }), category: fc.string(), date: fc.string() })`)
    - Use `fc.array(transactionArb, { minLength: 1 })`; assert `computeBalance(txs)` equals `txs.reduce((s, t) => s + t.amount, 0)` rounded to 2 dp
    - Tag: `// Feature: expense-budget-visualizer, Property 2: Balance equals sum`
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [x] 5.3 Implement `filterByMonth` and `sortTransactions`
    - Implement `filterByMonth(transactions, month)` — if `month` is null return all; otherwise return only transactions whose `date` starts with `month`
    - Implement `sortTransactions(transactions, option)` — returns a new sorted array for `amount_asc`, `amount_desc`, `category_asc`, `category_desc`; returns a reversed-insertion-order copy when `option` is null
    - _Requirements: 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_
  - [-]* 5.4 Write property test — Property 6: Monthly filter containment
    - **Property 6: Monthly filter containment**
    - Use `fc.array(transactionArb)` and `fc.string({ pattern: /\d{4}-(?:0[1-9]|1[0-2])/ })`
    - Assert every item in the result has `date.startsWith(month)` and no matching transaction is absent from the result
    - Tag: `// Feature: expense-budget-visualizer, Property 6: Monthly filter containment`
    - **Validates: Requirements 7.2, 7.3**
  - [-]* 5.5 Write property test — Property 7: Sort order correctness
    - **Property 7: Sort order correctness**
    - Use `fc.array(transactionArb, { minLength: 1 })` and `fc.constantFrom('amount_asc', 'amount_desc', 'category_asc', 'category_desc')`
    - Assert every adjacent pair `(a, b)` in the sorted result satisfies the ordering predicate for the chosen option
    - Tag: `// Feature: expense-budget-visualizer, Property 7: Sort order correctness`
    - **Validates: Requirements 8.1, 8.2, 8.3**
  - [x] 5.6 Implement `getCategoryOverages` and `buildChartData`
    - Implement `getCategoryOverages(grouped, limits)` — for each category in `limits`, if `grouped[cat] > limits[cat]` push an `Overage` object `{ category, total, limit, excess }`
    - Implement `buildChartData(grouped, categories)` — filter categories with non-zero totals; return `{ labels, values }` parallel arrays
    - _Requirements: 4.1, 4.3, 9.2, 9.3_

- [~] 6. Checkpoint — Core logic complete
  - Run the property-based test suite with `npx vitest --run`; ensure all property tests pass before proceeding with UI work.

- [x] 7. `UIManager` module — DOM rendering
  - [x] 7.1 Implement `renderTransactionList` and related helpers
    - Implement `renderTransactionList(transactions, overages)` — clear `#transaction-list`; if empty call `showEmptyState`; otherwise build `<li>` elements showing name, formatted amount, category, delete button, and red-background/warning-icon for overaged categories
    - Implement `showEmptyState(containerId, message)` and ensure it is called when the list has no items
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 9.2_
  - [x] 7.2 Implement `renderBalance` and `formatCurrency`
    - Implement `formatCurrency(total)` — prepend currency symbol, format with `toLocaleString` to produce thousands separators and exactly two decimal places
    - Implement `renderBalance(total, storageAvailable)` — set `#balance-display` text to formatted total; if `storageAvailable` is false show a dash or error state instead of a numeric value
    - _Requirements: 3.1, 3.4, 3.5, 3.6_
  - [-]* 7.3 Write property test — Property 3: Balance formatting invariant
    - **Property 3: Balance formatting invariant**
    - Use `fc.float({ min: 0, max: 999999999.99 })` to generate totals
    - Assert the returned string starts with the currency symbol, contains a decimal point, and ends with exactly two digit characters
    - Tag: `// Feature: expense-budget-visualizer, Property 3: Balance formatting invariant`
    - **Validates: Requirements 3.4**
  - [x] 7.4 Implement `renderCategoryDropdown`, `renderSpendingLimits`, and `renderAlertBanners`
    - Implement `renderCategoryDropdown(categories)` — rebuild `<option>` elements inside `#category`; preserve any currently-selected value
    - Implement `renderSpendingLimits(categories, limits)` — for each category add a labeled `<input type="number">` inside `#spending-limits-container`; populate with existing limit values
    - Implement `renderAlertBanners(overages)` — clear `#alert-banner-container`; for each overage insert a banner with the category name and excess amount rounded to 2 dp
    - _Requirements: 6.1, 6.4, 9.1, 9.3, 9.4_
  - [x] 7.5 Implement `renderSortControl`, `renderMonthFilter`, `applyTheme`, and error helpers
    - Implement `renderSortControl(activeSort)` — set the `<select>` value and apply a distinct style to the active option; remove style when `activeSort` is null
    - Implement `renderMonthFilter(activeMonth)` — set `#month-filter` value
    - Implement `applyTheme(theme)` — set `data-theme` attribute on `<html>`; switch within 200 ms
    - Implement `showFieldErrors(results)`, `clearFieldErrors()`, `showGlobalError(message)`, `clearGlobalError()`
    - _Requirements: 1.3, 8.1, 8.5, 10.1, 10.2, 10.4, 10.5_

- [x] 8. `ChartManager` module — Chart.js wrapper
  - [x] 8.1 Implement `ChartManager` with `init`, `update`, `showEmptyState`, `hideEmptyState`
    - Implement `init(canvasId)` — create a `new Chart(canvas, { type: 'pie', ... })` instance; store as `ChartManager.instance`; define `COLOR_PALETTE` array of at least 10 distinct hex colors
    - Implement `update(chartData)` — mutate `chart.data.labels` and `chart.data.datasets[0].data`; assign colors cycling through `COLOR_PALETTE`; add direct text labels via Chart.js `plugins.datalabels` or via the built-in `plugins.tooltip` so all segments remain distinguishable when categories exceed palette size; call `chart.update()`
    - Implement `showEmptyState()` — hide `#chart-canvas`; show a placeholder message in `#chart-canvas`'s parent
    - Implement `hideEmptyState()` — show `#chart-canvas`; hide placeholder
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Transaction Input feature — wire up the form
  - [~] 9.1 Implement the transaction submission handler
    - In `App.init()`, attach a `submit` event listener to `#input-form`
    - On submit: call `Validator.validateTransaction`; if errors call `UIManager.showFieldErrors` and abort; otherwise snapshot `AppState`, call `AppState.addTransaction` with a new `Transaction` (using `crypto.randomUUID()` or `Date.now().toString()` for `id`, today's ISO date), call `StorageManager.save`; on save failure rollback and show global error; on success call `UIManager.renderAll()` and `ChartManager.update()` and reset the form
    - Ensure the form resets only after a confirmed successful save
    - Ensure the entire sequence from submit to UI update completes within 500 ms
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1_
  - [ ]* 9.2 Write unit test — Form reset and error display examples
    - Test that submitting with an empty name shows an inline error on `#item-name` and does not add to `AppState.transactions`
    - Test that after a successful add all form fields are reset to their default/empty states
    - _Requirements: 1.3, 1.5_

- [ ] 10. Transaction List feature — render list and handle deletion
  - [~] 10.1 Implement delete handler and initial list render
    - Use event delegation on `#transaction-list` to handle clicks on delete controls
    - On delete click: snapshot `AppState`, call `AppState.removeTransaction(id)`, call `StorageManager.save`; on failure rollback and show global error; on success call `UIManager.renderTransactionList` and `UIManager.renderBalance` and `ChartManager.update()` within 1 second
    - Call `UIManager.renderTransactionList` on `App.init()` with all stored transactions
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 5.3_
  - [ ]* 10.2 Write unit test — Empty list message
    - Assert that when `AppState.transactions` is empty, `renderTransactionList` shows the empty-state message in `#transaction-list`
    - _Requirements: 2.6_

- [ ] 11. Total Balance Display
  - [~] 11.1 Integrate balance rendering into every state mutation path
    - Ensure `UIManager.renderBalance` is called after every add, delete, filter, and init event with the result of `TransactionManager.computeBalance(filteredTransactions)`
    - Ensure the display shows `$0.00` (or the configured currency symbol followed by "0.00") when the transaction array is empty
    - Ensure updates occur within 100 ms of each user action
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 11.2 Write unit test — Zero balance and currency format
    - Assert `formatCurrency(0)` returns the currency symbol followed by `"0.00"`
    - Assert `renderBalance` displays `"$0.00"` when `AppState.transactions` is empty
    - _Requirements: 3.5_

- [ ] 12. Spending Pie Chart
  - [~] 12.1 Integrate `ChartManager` into the render pipeline
    - In `App.init()`, call `ChartManager.init('chart-canvas')`
    - After every add, delete, filter, and init event, call `TransactionManager.buildChartData(grouped, categories)` and pass the result to `ChartManager.update()`
    - When `chartData.labels` is empty, call `ChartManager.showEmptyState()`; otherwise call `ChartManager.hideEmptyState()`
    - Ensure the chart re-renders within 1 second of any add or delete action
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 12.2 Write unit test — Chart empty state
    - Assert `ChartManager.showEmptyState()` hides the canvas and shows a placeholder message when called with no data
    - _Requirements: 4.4_

- [ ] 13. Data Persistence — localStorage integration
  - [~] 13.1 Implement `App.init()` to hydrate state from `localStorage`
    - Call `StorageManager.isAvailable()`; if false, show the persistent warning banner and set an `inMemoryMode` flag
    - Load `ebv_transactions`, `ebv_categories`, `ebv_limits`, and `ebv_theme` via `StorageManager.load`
    - Merge loaded categories with `CategoryManager.DEFAULT_CATEGORIES` (defaults first, no duplicates)
    - Populate `AppState` from loaded data; then call all render functions before accepting user input
    - _Requirements: 5.2, 5.4, 5.6, 6.4_
  - [ ]* 13.2 Write property test — Property 1: Serialization round-trip
    - **Property 1: Transaction serialization round-trip**
    - Use `fc.array(transactionArb)` to generate transaction arrays
    - Assert that `JSON.parse(JSON.stringify(txs))` produces an array where each transaction's `id`, `name`, `amount`, `category`, and `date` are strictly equal to the originals
    - Tag: `// Feature: expense-budget-visualizer, Property 1: Serialization round-trip`
    - **Validates: Requirements 5.4, 5.5**
  - [ ]* 13.3 Write unit test — localStorage unavailability fallback
    - Mock `localStorage` to always throw; assert the persistent warning banner appears and `App.init()` still completes rendering an empty state
    - _Requirements: 5.6, 3.6_

- [ ] 14. Custom Category Management
  - [~] 14.1 Implement the add-category handler
    - Attach a `click` listener to `#add-category-btn`
    - On click: read `#add-category-input` value; call `Validator.validateCategoryName`; on error call `UIManager.showFieldErrors`; on success snapshot, mutate `AppState.categories`, save to `ebv_categories`, on failure rollback and show global error, on success re-render `#category` dropdown and `#spending-limits-container` and reset the input
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 14.2 Write unit test — Default categories on init and duplicate rejection
    - Assert that after `App.init()` the category dropdown contains "Food", "Transport", and "Fun"
    - Assert that submitting a duplicate category name (case-insensitive) shows an inline error and does not modify `AppState.categories`
    - _Requirements: 6.1, 6.3_

- [ ] 15. Monthly Summary View
  - [~] 15.1 Implement the month filter handler
    - Attach a `change` listener to `#month-filter`
    - On change: call `AppState.setFilter(selectedValue || null)`; derive `filteredTransactions = TransactionManager.filterByMonth(AppState.transactions, AppState.filter.month)`; re-render `UIManager.renderTransactionList`, `UIManager.renderBalance`, and `ChartManager.update()` within 100 ms
    - When the filtered result is empty, call `UIManager.showEmptyState('#transaction-list', 'No transactions for this period.')`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 16. Transaction Sorting
  - [~] 16.1 Implement the sort control handler
    - Attach a `change` listener to `#sort-control`
    - On change: call `AppState.setSort(selectedValue || null)`; re-derive and re-render `UIManager.renderTransactionList(sortedFilteredTransactions, overages)` within 100 ms
    - Ensure the `Sort_Control` reflects the active option with a visually distinct style (set via CSS class); clear the style when default order is active
    - Ensure add and delete operations re-sort before rendering
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 17. Spending Limit Alerts
  - [~] 17.1 Implement per-category limit input handlers
    - Attach `change` listeners to each limit `<input>` rendered inside `#spending-limits-container` (use event delegation)
    - On change: validate the value is in range 0.01–999,999,999.99; call `AppState.setLimit(category, amount)`; save `ebv_limits`; on failure rollback and show error; on success recompute overages and call `UIManager.renderAlertBanners(overages)` and `UIManager.renderTransactionList(transactions, overages)`
    - Persist each category's limit under `ebv_limits`
    - _Requirements: 9.1, 9.2, 9.3, 9.5_
  - [~] 17.2 Integrate overage checks into all mutation paths
    - After every add, delete, filter change, and init, call `TransactionManager.getCategoryOverages(grouped, AppState.limits)`
    - Pass overages to `UIManager.renderTransactionList` (applies red background/warning icon) and `UIManager.renderAlertBanners` (shows category name and excess amount)
    - Remove highlights and banners when the category total falls back to ≤ limit
    - _Requirements: 9.2, 9.3, 9.4_
  - [ ]* 17.3 Write unit tests — Spending limit boundary examples
    - Test: category total exactly equals limit → no overage reported
    - Test: category total is one penny above limit → overage reported with correct excess
    - Test: delete transaction brings total back to ≤ limit → overage and highlight removed
    - _Requirements: 9.2, 9.3, 9.4_

- [ ] 18. Dark / Light Mode Toggle
  - [~] 18.1 Implement theme toggle handler and apply theme on init
    - In `App.init()`, call `UIManager.applyTheme(AppState.theme)` as the very first DOM operation (before rendering any list items) to prevent flash of unstyled content
    - Attach a `click` listener to `#theme-toggle`
    - On click: toggle theme between `'light'` and `'dark'`; call `AppState.setTheme`, `StorageManager.save('ebv_theme', ...)`, `UIManager.applyTheme`; ensure the full switch completes within 200 ms
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ]* 18.2 Write unit test — Theme applied before list render
    - Assert that `applyTheme` sets the `data-theme` attribute on `<html>` before any `<li>` elements exist in `#transaction-list`
    - _Requirements: 10.4_

- [~] 19. Checkpoint — All features complete
  - Run the full test suite with `npx vitest --run`; all property-based tests and unit tests must pass before proceeding to integration polish.

- [ ] 20. Integration tests and end-to-end polish
  - [~] 20.1 Write integration test — Full add-delete cycle
    - Add a transaction programmatically → assert `#transaction-list` shows it, `#balance-display` reflects the new total, chart labels include the category
    - Delete the transaction → assert all three revert to empty/zero state
    - _Requirements: 1.2, 2.4, 3.2, 3.3, 4.2_
  - [ ]* 20.2 Write integration test — Persistence across simulated reload
    - Add two transactions → capture `localStorage` state → re-run `App.init()` → assert both transactions are restored in the list, balance, and chart
    - _Requirements: 5.2_
  - [ ]* 20.3 Write integration test — Monthly filter end-to-end
    - Add transactions dated in three different months → select one month via `#month-filter` → assert only that month's transactions appear in list, balance, and chart
    - _Requirements: 7.2, 7.3, 7.4_
  - [ ]* 20.4 Write integration test — Spending limit alert end-to-end
    - Set a limit for a category → add transactions that exceed it → assert red highlighting on affected `<li>` elements and an alert banner in `#alert-banner-container` → delete the overage transaction → assert highlights and banner are cleared
    - _Requirements: 9.2, 9.3, 9.4_
  - [~] 20.5 Performance and responsive-layout polish
    - Verify the app renders all stored content within 2 seconds on init with 500 transactions (use a seeded dataset in a manual smoke test)
    - Apply responsive CSS so the layout remains usable on viewport widths from 320 px to 1440 px
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [~] 21. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run`; all property, unit, and integration tests must pass. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all non-starred tasks must be implemented.
- The write-then-render contract (validate → snapshot → mutate → save → render) must be followed for every state mutation to guarantee UI consistency with persisted state.
- `StorageManager.isAvailable()` is called once on `App.init()`; if false, all `StorageManager.save()` calls are skipped and the app runs in-memory mode.
- Default categories (Food, Transport, Fun) are hardcoded and never written to `ebv_categories`; custom categories are written there on addition.
- The `transactionArb` fast-check arbitrary is defined once in a test helper file and imported by all property tests.
- Property test minimum iterations: 100 per property.
- No build step is required; the test suite is the only `devDependency` (Vitest + fast-check).


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1", "4.4"] },
    { "id": 2, "tasks": ["3.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["5.1", "5.3", "5.6", "7.2"] },
    { "id": 4, "tasks": ["5.2", "5.4", "5.5", "7.1", "7.3", "7.4", "7.5", "8.1"] },
    { "id": 5, "tasks": ["9.1", "11.1", "13.1"] },
    { "id": 6, "tasks": ["9.2", "10.1", "11.2", "12.1", "13.2", "13.3"] },
    { "id": 7, "tasks": ["10.2", "12.2", "14.1", "15.1", "16.1"] },
    { "id": 8, "tasks": ["14.2", "17.1", "18.1"] },
    { "id": 9, "tasks": ["17.2", "17.3", "18.2"] },
    { "id": 10, "tasks": ["20.1", "20.5"] },
    { "id": 11, "tasks": ["20.2", "20.3", "20.4"] }
  ]
}
```
