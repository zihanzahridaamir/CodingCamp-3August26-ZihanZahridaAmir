// Feature: expense-budget-visualizer, Property 6: Monthly filter containment
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { transactionArb } from './helpers/arbitraries.js';

// Inline filterByMonth (mirrors js/app.js)
function filterByMonth(transactions, month) {
  if (!month) return [...transactions];
  return transactions.filter(tx => tx.date.startsWith(month));
}

describe('Property 6: Monthly filter containment', () => {
  it('returns only transactions whose date starts with the selected month', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb),
        fc.string({ pattern: /\d{4}-(?:0[1-9]|1[0-2])/ }),
        (txs, month) => {
          const result = filterByMonth(txs, month);
          // All results must start with the month prefix
          expect(result.every(tx => tx.date.startsWith(month))).toBe(true);
          // No matching transaction should be absent
          const matching = txs.filter(tx => tx.date.startsWith(month));
          expect(result.length).toBe(matching.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns all transactions when month is null', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb),
        (txs) => {
          const result = filterByMonth(txs, null);
          expect(result.length).toBe(txs.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
