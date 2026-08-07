# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that enables users to track personal expenses, categorize spending, and visualize their budget distribution through interactive charts. The application runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted via the browser's Local Storage API. No backend server is required. The application supports a clean, minimal interface with dark/light mode, custom categories, monthly summary views, sortable transaction lists, and spending limit alerts.

## Glossary

- **App**: The Expense and Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, monetary amount, and category
- **Category**: A label assigned to a transaction (e.g., Food, Transport, Fun, or user-defined)
- **Transaction_List**: The scrollable, rendered list of all stored transactions
- **Input_Form**: The HTML form used to submit new transactions
- **Chart**: The pie chart that visualizes spending distribution by category
- **Balance_Display**: The UI element showing the computed total of all transaction amounts
- **Local_Storage**: The browser's Web Storage API used for client-side data persistence
- **Monthly_Summary**: An aggregated view of transactions filtered by a selected calendar month and year
- **Spending_Limit**: A user-defined monetary threshold per category, above which spending is highlighted
- **Theme_Toggle**: The UI control that switches between dark mode and light mode
- **Sort_Control**: The UI control that changes the ordering of the Transaction_List
- **Validator**: The client-side logic that checks Input_Form field values before submission

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to submit an expense via a form with name, amount, and category fields, so that I can record a new transaction quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL include a text field for item name accepting 1–100 characters, a numeric field for amount accepting values between 0.01 and 999,999,999.99, and a dropdown for category selection with at least one selectable option.
2. WHEN the user submits the Input_Form with all fields populated and a valid positive amount, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage within 500 milliseconds.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL display an inline error message adjacent to each empty field identifying which field is empty and SHALL prevent the transaction from being added to the Transaction_List.
4. WHEN the user submits the Input_Form with an amount that is not a number between 0.01 and 999,999,999.99, THE Validator SHALL display an inline error message on the amount field indicating the valid range and SHALL prevent the transaction from being added to the Transaction_List.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its default unselected state.
6. IF Local_Storage is unavailable when the user submits the Input_Form, THEN THE App SHALL display an error message indicating the transaction could not be saved and SHALL NOT add the transaction to the Transaction_List.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my transactions, so that I can review my spending history at a glance.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name (up to 100 characters), amount (formatted to 2 decimal places with a currency symbol), and category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible viewport area allocated to it.
3. WHEN a new transaction is added, THE Transaction_List SHALL update to include the new transaction within 1 second and without requiring a page reload.
4. WHEN the user activates the delete control on a transaction, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage within 1 second.
5. IF the delete operation on a transaction fails, THEN THE App SHALL display an error message indicating the deletion was unsuccessful and retain the transaction in the Transaction_List and in Local_Storage.
6. WHEN the Transaction_List contains no transactions, THE App SHALL display a message indicating that no transactions have been recorded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total expenditure at the top of the page, so that I always know my running total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the arithmetic sum of all transaction amounts currently stored in Local_Storage.
2. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total within 100 milliseconds of the addition.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 100 milliseconds of the deletion.
4. THE Balance_Display SHALL format the total as a monetary value with two decimal places, a thousands separator, and a prepended currency symbol.
5. WHEN no transactions exist, THE Balance_Display SHALL show the currency symbol followed by "0.00".
6. IF Local_Storage is unavailable on initialization, THEN THE App SHALL display an error message and SHALL NOT show a numeric total in the Balance_Display.

---

### Requirement 4: Spending Chart

**User Story:** As a user, I want a pie chart showing my spending by category, so that I can understand where my money is going visually.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart where each segment represents a category's share of the total sum of all stored expense transaction amounts; categories with zero total shall be excluded from the chart.
2. WHEN transactions are added or deleted, THE Chart SHALL re-render to reflect the updated category totals within 1 second and without requiring a page reload.
3. THE Chart SHALL use a palette of at least 10 distinct colors, assigning one color per category; when the number of categories exceeds the palette size, colors SHALL cycle and each segment SHALL display a direct text label so that all categories remain distinguishable.
4. WHEN no transactions exist, THE Chart SHALL display a visible text message indicating there is no spending data to visualize.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my data when I close and reopen the app.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction dataset to Local_Storage before the Input_Form resets; IF the write fails, THE App SHALL display an error message and SHALL NOT reset the Input_Form.
2. WHEN the App initializes, THE App SHALL read all transactions from Local_Storage and render them in the Transaction_List, Balance_Display, and Chart before accepting user input.
3. WHEN a transaction is deleted, THE App SHALL write the updated transaction dataset to Local_Storage before updating the UI; IF the write fails, THE App SHALL display an error message and SHALL NOT remove the transaction from the UI.
4. THE App SHALL store transaction data in Local_Storage as a serialized JSON string under a fixed, documented key name.
5. FOR ALL valid transaction datasets, serializing to JSON and then deserializing SHALL produce a dataset where each transaction's item name, amount, and category are equal to the originals (round-trip property).
6. IF Local_Storage is unavailable or read access fails on initialization, THEN THE App SHALL display a persistent warning message informing the user that data cannot be saved and SHALL operate for the current session using in-memory storage only.

---

### Requirement 6: Category Management

**User Story:** As a user, I want to add custom expense categories beyond the defaults, so that I can organize spending to fit my personal needs.

#### Acceptance Criteria

1. THE App SHALL provide the default categories: Food, Transport, and Fun, available in the Input_Form category dropdown on first load.
2. WHEN the user submits a new custom category name that is between 1 and 50 characters and is not a case-insensitive duplicate of any existing category, THE App SHALL add the new category to the category dropdown and persist it to Local_Storage.
3. WHEN the user submits a new custom category name that is empty, exceeds 50 characters, or is a case-insensitive duplicate of an existing category, THE Validator SHALL display an error message identifying the reason and SHALL prevent the category from being added.
4. WHEN the App initializes, THE App SHALL load all user-defined categories from Local_Storage and include them in the category dropdown alongside the default categories.
5. WHERE a custom category has been added, THE Chart SHALL include that category in the spending distribution visualization whenever it has a non-zero total.

---

### Requirement 7: Monthly Summary View

**User Story:** As a user, I want to view a summary of my spending filtered to a specific month and year, so that I can track my budget on a monthly basis.

#### Acceptance Criteria

1. THE App SHALL provide a month and year selector control that allows the user to choose any calendar month and year.
2. WHEN the user selects a month and year, THE App SHALL filter the Transaction_List and Chart within 100 milliseconds to display only transactions whose recorded date falls within that calendar month and year.
3. WHEN the user selects a month and year, THE Balance_Display SHALL update within 100 milliseconds to reflect the arithmetic sum of only those transactions whose recorded date falls within the selected month and year.
4. WHEN the user clears the month filter or selects the "All" option, THE App SHALL revert the Transaction_List, Chart, and Balance_Display to show all transactions within 100 milliseconds.
5. WHEN a month and year is selected that contains no transactions, THE App SHALL display a visible message indicating no transactions exist for that period.

---

### Requirement 8: Transaction Sorting

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can find and analyze transactions more easily.

#### Acceptance Criteria

1. THE Sort_Control SHALL provide exactly four options: amount ascending, amount descending, category name alphabetical ascending, and category name alphabetical descending.
2. THE App SHALL display transactions in reverse-chronological insertion order by default when no sort option is selected.
3. WHEN the user selects a sort option, THE Transaction_List SHALL re-render in the selected order within 100 milliseconds.
4. WHILE a sort option is active, THE Transaction_List SHALL maintain the selected sort order when new transactions are added or deleted.
5. THE Sort_Control SHALL apply a visually distinct style (e.g., highlight or check mark) to the currently active sort option; no style SHALL be applied when the default order is active.

---

### Requirement 9: Spending Limit Alerts

**User Story:** As a user, I want to set a spending limit per category and be alerted when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide a numeric input field for each category that allows the user to set a monetary Spending_Limit between 0.01 and 999,999,999.99.
2. WHEN the total spending for a category is strictly greater than the Spending_Limit set for that category, THE App SHALL highlight all transactions in that category in the Transaction_List with a red background or a warning icon.
3. WHEN the total spending for a category is strictly greater than the Spending_Limit, THE App SHALL display a visible alert banner identifying the category name and the exact amount by which the limit has been exceeded, rounded to two decimal places.
4. WHEN a transaction is deleted and the updated category total is less than or equal to the Spending_Limit, THE App SHALL remove the highlight from affected transactions and dismiss the alert banner for that category.
5. THE App SHALL persist each category's Spending_Limit to Local_Storage under a fixed, documented key so that limits are restored on next load.

---

### Requirement 10: Dark and Light Mode

**User Story:** As a user, I want to toggle between dark and light display modes, so that I can use the app comfortably in different lighting environments.

#### Acceptance Criteria

1. THE App SHALL render in light mode by default on first load when no theme preference is stored in Local_Storage.
2. WHEN the user activates the Theme_Toggle, THE App SHALL switch between light mode and dark mode within 200 milliseconds.
3. THE App SHALL persist the selected theme preference to Local_Storage immediately when the Theme_Toggle is activated.
4. WHEN the App initializes, THE App SHALL apply the previously saved theme preference from Local_Storage before rendering visible content, to prevent a flash of unstyled content.
5. WHILE dark mode is active, THE App SHALL apply a dark background color (luminance ≤ 20%) and a light foreground color (luminance ≥ 80%) to all visible UI elements, including the Chart canvas background and axis labels.

---

### Requirement 11: Technology Stack Constraints

**User Story:** As a developer, I want the app built with HTML, CSS, and Vanilla JavaScript only, so that it has no build dependencies and runs as a standalone file in any modern browser.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript; no JavaScript frameworks or UI component libraries (e.g., React, Vue, Angular, Bootstrap JS) SHALL be used; a charting library (e.g., Chart.js) loaded via CDN or bundled locally is permitted.
2. THE App SHALL use exactly one CSS file located at `css/styles.css`; no other CSS files shall be linked.
3. THE App SHALL use exactly one JavaScript file located at `js/app.js`; no other application JavaScript files shall be referenced except for permitted charting library scripts.
4. THE App SHALL function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari without polyfills or build steps.
5. THE App SHALL require no backend server to operate; all functionality SHALL be executable by opening the HTML file directly in a browser or serving it as a static file.

---

### Requirement 12: Performance and Responsiveness

**User Story:** As a user, I want the app to respond quickly to all interactions, so that data entry and visualization feel seamless.

#### Acceptance Criteria

1. THE App SHALL complete initial load and render all stored transactions within 2 seconds on a standard desktop browser with up to 500 stored transactions, measured from page load to fully rendered UI.
2. WHEN a transaction is added or deleted, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds, measured from the user action to visible DOM update.
3. WHEN the user interacts with the Sort_Control or monthly filter, THE App SHALL re-render the Transaction_List within 100 milliseconds of the user action.
4. THE App SHALL remain functional with no single UI operation taking longer than 500 milliseconds when up to 500 transactions are stored in Local_Storage.
