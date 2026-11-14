import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import { createItinerary, getItineraryById, deleteItinerary } from '../src/services/itineraryService.js';
import { savePlan } from '../src/services/planEditingService.js';
import { createPlanDraft, planPayload } from '../../frontend/src/utils/planDraft.js';

test('Expenses persist with the plan, survive reload and reject unauthorized or invalid changes atomically', async () => {
  const users = [];
  let trip;
  try {
    for (let index = 0; index < 3; index++) users.push(await prisma.users.create({ data: { email: `expenses-${Date.now()}-${index}@example.com`, full_name: `Expense Test ${index}`, is_active: true } }));
    const [owner, member, outsider] = users;
    trip = await createItinerary(owner.id, { name: 'Expense popup integration', costScope: 'GROUP', collaboratorIds: [String(member.id)], items: [{ customName: 'Stop to delete' }] });
    let draft = planPayload(createPlanDraft(trip), trip, true);
    draft.expenses = [{ id: 'expense-a', title: 'Ăn trưa', category: 'food', amount: 10001, payerId: String(owner.id), splitWith: [String(owner.id), String(member.id)], date: '2026-11-11' }];
    draft.items = [];
    const saved = await savePlan(trip.id, owner.id, draft);
    assert.equal(saved.totalCost, 10001);
    assert.equal(saved.costMeals, 10001);
    assert.equal(saved.expenses[0].payerId, String(owner.id));
    assert.deepEqual(saved.items, []);
    assert.deepEqual((await getItineraryById(trip.id, owner.id)).expenses, draft.expenses);
    const invalid = planPayload(createPlanDraft(saved), saved, true);
    invalid.expenses[0] = { ...invalid.expenses[0], payerId: String(outsider.id) };
    await assert.rejects(() => savePlan(trip.id, owner.id, invalid), error => error.status === 400);
    assert.equal((await getItineraryById(trip.id, owner.id)).expenses[0].payerId, String(owner.id));
    await assert.rejects(() => savePlan(trip.id, outsider.id, draft), error => error.status === 403);
    draft = planPayload(createPlanDraft(saved), saved, true);
    draft.expenses = [];
    const empty = await savePlan(trip.id, owner.id, draft);
    assert.deepEqual(empty.expenses, []);
    assert.equal(empty.totalCost, 0);
    assert.equal(empty.costMeals, 0);
  } finally {
    if (trip) await deleteItinerary(trip.id, users[0].id);
    if (users.length) await prisma.users.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    await prisma.$disconnect();
  }
});
