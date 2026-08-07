// Shared fast-check arbitraries for expense-budget-visualizer property tests
import * as fc from 'fast-check';

/**
 * Generates a valid Transaction object matching the Transaction interface:
 *   { id, name, amount, category, date }
 */
export const transactionArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  amount: fc.float({ min: 0.01, max: 999999999.99, noNaN: true }),
  category: fc.string({ minLength: 1 }),
  date: fc.string({ minLength: 10, maxLength: 10 }).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s))
});
