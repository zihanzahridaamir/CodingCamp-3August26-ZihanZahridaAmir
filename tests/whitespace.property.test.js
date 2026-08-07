// Feature: expense-budget-visualizer, Property 5: Whitespace-only strings invalid
// Validates: Requirements 1.3, 6.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- inline CategoryManager (mirrors js/app.js) ---
const CategoryManager = {
  isValidName(name) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    return trimmed.length >= 1 && trimmed.length <= 50;
  }
};

// --- inline Validator (mirrors js/app.js) ---
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
  }
};

describe('Property 5: Whitespace-only strings are invalid inputs', () => {
  it('rejects whitespace-only item names', () => {
    // **Validates: Requirements 1.3**
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 }),
        (s) => {
          const result = Validator.validateItemName(s);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects whitespace-only category names', () => {
    // **Validates: Requirements 6.3**
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 }),
        (s) => {
          expect(CategoryManager.isValidName(s)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
