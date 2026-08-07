// Feature: expense-budget-visualizer, Property 2: Balance equals sum
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { transactionArb } from './helpers/arbitraries.js';

// Inline computeBalance (mirrors js/app.js)
function computeBalance(transactions) {
  const sum = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  return Math.round(sum * 100) / 100;
}

describe('Property 2: Balance equals sum of transactions', () => {
  it('balance equals sum of all transaction amounts rounded to 2dp', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1 }),
        (txs) => {
          const expected = Math.round(txs.reduce((s, t) => s + t.amount, 0) * 100) / 100;
          const result = computeBalance(txs);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
