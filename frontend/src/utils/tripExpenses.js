export const EXPENSE_CATEGORIES = [
  ['flight', 'Chuyến bay', 'costTransport'], ['lodging', 'Chỗ ở', 'costAccommodation'],
  ['rental', 'Xe thuê', 'costTransport'], ['transit', 'Phương tiện công cộng', 'costTransport'],
  ['food', 'Ẩm thực', 'costMeals'], ['drinks', 'Đồ uống', 'costMeals'],
  ['sightseeing', 'Tham quan', 'costAttractions'], ['activities', 'Hoạt động', 'costAttractions'],
  ['shopping', 'Mua sắm', 'costContingency'], ['fuel', 'Xăng', 'costTransport'],
  ['groceries', 'Hàng tạp hóa', 'costMeals'], ['other', 'Khác', 'costContingency']
];

export function expenseTotals(expenses) {
  const totals = { costTransport: 0, costMeals: 0, costAttractions: 0, costAccommodation: 0, costContingency: 0 };
  for (const expense of expenses) {
    const key = EXPENSE_CATEGORIES.find(([id]) => id === expense.category)?.[2] || 'costContingency';
    totals[key] += Number(expense.amount);
  }
  return totals;
}

export function planExpenses(plan) {
  if (Array.isArray(plan.expenses)) return plan.expenses;
  const labels = [['costTransport', 'Di chuyển', 'transit'], ['costMeals', 'Ăn uống', 'food'], ['costAttractions', 'Tham quan', 'sightseeing'], ['costAccommodation', 'Lưu trú', 'lodging'], ['costContingency', 'Dự phòng', 'other']];
  return labels.filter(([key]) => Number(plan[key]) > 0).map(([key, title, category]) => ({ id: `legacy-${key}`, title, category, amount: Number(plan[key]) * (plan.costScope === 'PERSON' ? Number(plan.travelerCount || 1) : 1), payerId: null, splitWith: [], date: '' }));
}

export function expenseBalances(expenses) {
  const balances = new Map();
  const add = (id, amount) => balances.set(id, (balances.get(id) || 0) + amount);
  for (const expense of expenses) {
    if (!expense.payerId || !expense.splitWith.length) continue;
    add(expense.payerId, Number(expense.amount));
    const share = Math.floor(expense.amount / expense.splitWith.length);
    const remainder = expense.amount % expense.splitWith.length;
    expense.splitWith.forEach((id, index) => add(id, -share - (index < remainder ? 1 : 0)));
  }
  return [...balances].map(([id, amount]) => ({ id, amount }));
}
