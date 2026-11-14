import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTripExpenses } from '../src/services/tripExpenseInput.js';
import { expenseTotals, planExpenses, expenseBalances } from '../../frontend/src/utils/tripExpenses.js';

const expense = { id: 'expense-1', title: 'Bữa trưa', amount: 10001, category: 'food', payerId: '1', splitWith: ['1', '2', '3'], date: '2026-11-11' };
test('Expenses preserve metadata, category totals and every dong in shared balances', () => {
  const result = normalizeTripExpenses([expense], ['1', '2', '3']);
  assert.equal(result.total, 10001);
  assert.equal(result.costs.Meals, 10001);
  assert.deepEqual(result.expenses[0], expense);
  assert.equal(expenseTotals(result.expenses).costMeals, 10001);
  assert.deepEqual(expenseBalances([expense]), [{ id: '1', amount: 6667 }, { id: '2', amount: -3334 }, { id: '3', amount: -3333 }]);
  assert.equal(expenseBalances([expense]).reduce((sum, value) => sum + value.amount, 0), 0);
  assert.deepEqual(expenseBalances([{ ...expense, splitWith: [] }]), []);
  const legacy = planExpenses({ costMeals: 50000, costScope: 'PERSON', travelerCount: 3 });
  assert.equal(legacy[0].amount, 150000);
  assert.equal(legacy[0].payerId, null);
  assert.deepEqual(planExpenses({ expenses: [], costMeals: 100 }), []);
});
test('Expense input rejects invalid money, foreign members, duplicate IDs and invalid dates', () => {
  for (const change of [{ amount: -1 }, { amount: 1.5 }, { amount: Infinity }, { category: '__proto__' }, { payerId: '77' }, { splitWith: ['77'] }, { splitWith: ['1', '1'] }, { payerId: null }, { date: '2026-02-31' }, { title: '' }]) {
    assert.throws(() => normalizeTripExpenses([{ ...expense, ...change }], ['1', '2', '3']), error => error.status === 400);
  }
  assert.throws(() => normalizeTripExpenses([expense, expense], ['1', '2', '3']));
  assert.deepEqual(normalizeTripExpenses([], ['1']).expenses, []);
});
