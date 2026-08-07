// Feature: expense-budget-visualizer, Property 3: Balance formatting invariant
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Inline formatCurrency (mirrors js/app.js UIManager)
function formatCurrency(total) {
  return '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

describe('Property 3: Balance formatting invariant', () => {
  it('formatted string starts with $, contains decimal point, ends with exactly 2 digits', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 999999999.99, noNaN: true }),
        (total) => {
          const result = formatCurrency(total);
          // Starts with currency symbol
          expect(result.startsWith('$')).toBe(true);
          // Contains a decimal point
          expect(result).toContain('.');
          // Ends with exactly two digit characters
          expect(/\.\d{2}$/.test(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formats zero as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
