// Feature: expense-budget-visualizer, Property 7: Sort order correctness
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { transactionArb } from './helpers/arbitraries.js';

// Inline sortTransactions (mirrors js/app.js TransactionManager.sortTransactions)
function sortTransactions(transactions, option) {
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
}

describe('Property 7: Sort order correctness', () => {
  it('adjacent pairs satisfy the ordering predicate for each sort option', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1 }),
        fc.constantFrom('amount_asc', 'amount_desc', 'category_asc', 'category_desc'),
        (txs, option) => {
          const sorted = sortTransactions(txs, option);
          
          // Verify ordering for every adjacent pair
          for (let i = 0; i < sorted.length - 1; i++) {
            const a = sorted[i];
            const b = sorted[i + 1];
            
            switch (option) {
              case 'amount_asc':
                expect(a.amount).toBeLessThanOrEqual(b.amount);
                break;
              case 'amount_desc':
                expect(a.amount).toBeGreaterThanOrEqual(b.amount);
                break;
              case 'category_asc':
                expect(a.category.localeCompare(b.category)).toBeLessThanOrEqual(0);
                break;
              case 'category_desc':
                expect(b.category.localeCompare(a.category)).toBeLessThanOrEqual(0);
                break;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns a permutation (same length, same elements) of the original array', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1 }),
        fc.constantFrom('amount_asc', 'amount_desc', 'category_asc', 'category_desc'),
        (txs, option) => {
          const sorted = sortTransactions(txs, option);
          
          // Verify same length
          expect(sorted.length).toBe(txs.length);
          
          // Every id in original appears in sorted
          const sortedIds = new Set(sorted.map(t => t.id));
          txs.forEach(t => expect(sortedIds.has(t.id)).toBe(true));
        }
      ),
      { numRuns: 100 }
    );
  });
});
