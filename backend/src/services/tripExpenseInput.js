const categories = { flight: 'Transport', lodging: 'Accommodation', rental: 'Transport', transit: 'Transport', food: 'Meals', drinks: 'Meals', sightseeing: 'Attractions', activities: 'Attractions', shopping: 'Contingency', fuel: 'Transport', groceries: 'Meals', other: 'Contingency' };
const fail = message => { throw { status: 400, message }; };

export function normalizeTripExpenses(input, memberIds) {
  if (!Array.isArray(input) || input.length > 500) fail('Tối đa 500 khoản chi trong một kế hoạch.');
  const members = new Set(memberIds.map(String));
  const ids = new Set();
  const costs = { Transport: 0, Meals: 0, Attractions: 0, Accommodation: 0, Contingency: 0 };
  const expenses = input.map(item => {
    if (!item || typeof item !== 'object') fail('Khoản chi không hợp lệ.');
    const id = String(item.id || '');
    const title = String(item.title || '').trim();
    const amount = Number(item.amount);
    if (!id || id.length > 100 || ids.has(id)) fail('Mã khoản chi bị trùng hoặc không hợp lệ.');
    ids.add(id);
    if (!title || title.length > 255 || !Object.hasOwn(categories, item.category)) fail('Tên hoặc danh mục khoản chi không hợp lệ.');
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999) fail('Số tiền phải là số nguyên dương, tối đa 999999999999 đ.');
    const payerId = item.payerId == null ? null : String(item.payerId);
    if (payerId !== null && !members.has(payerId)) fail('Người trả phải là thành viên của kế hoạch.');
    if (!Array.isArray(item.splitWith)) fail('Danh sách chia tiền không hợp lệ.');
    const splitWith = item.splitWith.map(String);
    if (new Set(splitWith).size !== splitWith.length || splitWith.some(id => !members.has(id)) || (!payerId && splitWith.length)) fail('Người chia tiền phải thuộc kế hoạch và cần xác định người trả.');
    const date = String(item.date || '');
    if (date) {
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail('Ngày chi phí không hợp lệ.');
    }
    costs[categories[item.category]] += amount;
    return { id, title, amount, category: item.category, payerId, splitWith, date };
  });
  const total = Object.values(costs).reduce((sum, value) => sum + value, 0);
  if (total > 999999999999) fail('Tổng chi phí vượt giới hạn 999999999999 đ.');
  return { expenses, costs, total };
}
