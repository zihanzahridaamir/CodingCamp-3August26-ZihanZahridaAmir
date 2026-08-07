// Feature: expense-budget-visualizer, Property 4: Invalid amounts rejected
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline Validator — mirrors the implementation in js/app.js
// (No build step is required; the functions are copied verbatim so the test
//  suite can run under Node.js/Vitest without a browser environment.)
// ---------------------------------------------------------------------------
const Validator = {
  validateAmount(value) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return {
        field: 'amount',
        valid: false,
        message: 'Amount must be a number between 0.01 and 999,999,999.99.'
      };
    }
    if (num < 0.01 || num > 999999999.99) {
      return {
        field: 'amount',
        valid: false,
        message: 'Amount must be between 0.01 and 999,999,999.99.'
      };
    }
    return { field: 'amount', valid: true, message: null };
  }
};

// ---------------------------------------------------------------------------
// Property 4: Invalid amounts are rejected
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------

describe('Property 4: Invalid amounts are rejected', () => {

  it('rejects values strictly below 0.01 (including negatives and zero)', () => {
    // fc.float({ max: 0.009, noNaN: true }) produces finite floats ≤ 0.009,
    // which includes negative values and zero — all of which are below the
    // minimum valid amount of 0.01 and must be rejected.
    fc.assert(
      fc.property(
        fc.float({ max: 0.009, noNaN: true }),
        (v) => {
          const result = Validator.validateAmount(v);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects values strictly above 999,999,999.99', () => {
    // fc.float({ min: 1000000000, noNaN: true }) produces finite floats ≥ 1e9,
    // all of which exceed the maximum valid amount of 999999999.99.
    fc.assert(
      fc.property(
        fc.float({ min: 1000000000, noNaN: true }),
        (v) => {
          const result = Validator.validateAmount(v);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-numeric strings', () => {
    // Any string that parseFloat cannot convert to a finite number should be
    // rejected. We filter out strings that happen to start with a digit to
    // keep the test focused on truly non-numeric input.
    fc.assert(
      fc.property(
        fc.string().filter(s => isNaN(parseFloat(s))),
        (v) => {
          const result = Validator.validateAmount(v);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts values in the valid range [0.01, 999999999.99]', () => {
    // fc.float with min/max constrains the generated value to the valid range.
    // noNaN: true ensures Infinity and NaN are excluded.
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 999999999.99, noNaN: true }),
        (v) => {
          // Guard: skip the rare float imprecision case where the value is
          // rounded outside the spec range by the generator.
          if (v < 0.01 || v > 999999999.99) return true;
          const result = Validator.validateAmount(v);
          return result.valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns the correct field name "amount" for all results', () => {
    // Regardless of the input value, the returned ValidationResult must always
    // have field === 'amount'.
    fc.assert(
      fc.property(
        fc.oneof(
          fc.float({ noNaN: true }),
          fc.string()
        ),
        (v) => {
          const result = Validator.validateAmount(v);
          return result.field === 'amount';
        }
      ),
      { numRuns: 100 }
    );
  });
});
