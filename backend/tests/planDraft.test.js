import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanDraft, planPayload, toLocalDateTime } from '../../frontend/src/utils/planDraft.js';

test('Plan editor preserves local times, zero costs, identity and permissions through an untouched draft', () => {
    const trip = { id: '5', name: 'My plan', userId: '1', updatedAt: '2026-10-29T00:00:00Z',
        startDate: '2026-11-01T15:00:00Z', endDate: '2026-11-01T18:00:00Z', budget: 0, costScope: 'GROUP', preferences: ['food', 'nature'],
        items: [{ id: '10', locationId: '3', customName: 'Personal stop', note: '[DAY:2] Free time', startTime: '2026-11-01T16:00:00Z', durationMinutes: 0, travelMinutes: 0 }],
        packingItems: [{ id: '20', itemName: 'My camera', quantity: 2, isPacked: true }],
        collaborators: [{ userId: '2', permission: 'edit', user: { name: 'Friend', email: 'friend@example.com' } }]
    };
    const draft = createPlanDraft(trip);
    assert.equal(draft.items[0].day, 2);
    assert.equal(draft.items[0].note, 'Free time');
    assert.equal(draft.items[0].durationMinutes, 0);
    const payload = planPayload(draft, trip, true);
    assert.equal(payload.startDate, new Date(trip.startDate).toISOString());
    assert.equal(payload.items[0].startTime, new Date(trip.items[0].startTime).toISOString());
    assert.equal(payload.items[0].id, '10');
    assert.equal(payload.packingItems[0].id, '20');
    assert.equal(payload.packingItems[0].isPacked, true);
    assert.equal(payload.budget, 0);
    assert.deepEqual(payload.preferences, ['food', 'nature']);
    assert.equal(payload.collaborators[0].permission, 'edit');
    assert.equal(planPayload(draft, trip, false).collaborators, undefined);
    assert.equal(planPayload(draft, trip, false).visibility, undefined);
    assert.equal(toLocalDateTime(null), '');
    assert.equal(toLocalDateTime('invalid'), '');
});
