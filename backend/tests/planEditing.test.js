import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import { createItinerary, getItineraryById, deleteItinerary } from '../src/services/itineraryService.js';
import { savePlan } from '../src/services/planEditingService.js';

const draftOf = trip => ({
    ...trip, name: trip.name, startDate: trip.startDate, endDate: trip.endDate,
    status: 'draft', costScope: trip.costScope || 'PERSON', travelerCount: trip.travelerCount || 1,
    items: trip.items.map(item => ({ ...item, day: Number(item.note?.match(/\[DAY:(\d+)\]/)?.[1] || 1) })),
    packingItems: trip.packingItems, collaborators: trip.collaborators
});

test('Full plan edits persist times, stop order, custom activities, costs, packing and member permissions atomically', async () => {
    const users = [];
    let trip;
    try {
        for (let i = 0; i < 3; i++) {
            users.push(await prisma.users.create({ data: { email: `plan-editor-${Date.now()}-${i}@example.com`, full_name: `Editor ${i}`, is_active: true } }));
        }
        const [owner, member, outsider] = users;
        trip = await createItinerary(owner.id, {
            name: 'Original plan', items: [{ customName: 'Old activity', note: '[DAY:1] Keep me' }, { customName: 'Second activity' }],
            packingItems: [{ itemName: 'Backpack', quantity: 1 }]
        });
        const draft = draftOf(trip);
        Object.assign(draft, {
            name: 'My custom itinerary', startDate: '2026-11-01T01:00:00.000Z', endDate: '2026-11-03T12:00:00.000Z',
            startLocation: 'Hà Nội', endLocation: 'Đà Lạt', destination: 'Đà Lạt', transportMode: 'Xe riêng + đi bộ',
            description: 'A personal plan', preferences: ['food', 'relax'], travelerCount: 3,
            budget: 0, costScope: 'PERSON', costTransport: 100, costMeals: 50, costAttractions: 20, costAccommodation: 200, costContingency: 30,
            items: [
                { ...draft.items[1], day: 1, customName: 'First now' },
                { ...draft.items[0], day: 2, note: 'My own note', startTime: '2026-11-02T02:00:00.000Z', endTime: '2026-11-02T04:00:00.000Z', durationMinutes: 120, travelMinutes: 15, travelDistanceKm: 4.5 },
                { customName: 'Free afternoon', day: 3, note: 'No coordinates needed' }
            ],
            packingItems: [{ ...draft.packingItems[0], itemName: 'Large backpack', quantity: 2, notes: 'Waterproof', isPacked: true }, { itemName: 'Camera', category: 'devices', quantity: 1 }],
            collaborators: [{ email: member.email.toUpperCase(), permission: 'view' }]
        });
        const saved = await savePlan(trip.id, owner.id, draft);
        assert.equal(saved.name, draft.name);
        assert.equal(new Date(saved.startDate).toISOString(), draft.startDate);
        assert.equal(saved.totalDays, 3);
        assert.equal(saved.budget, 0, 'Explicit zero budget must not become the cost total');
        assert.equal(saved.totalCost, 1200);
        assert.equal(saved.transportMode, draft.transportMode);
        assert.deepEqual(saved.preferences, ['food', 'relax']);
        assert.equal(saved.items[0].id, trip.items[1].id);
        assert.equal(saved.items[1].id, trip.items[0].id);
        assert.equal(saved.items[1].note, '[DAY:2] My own note');
        assert.equal(saved.items[1].durationMinutes, 120);
        assert.equal(saved.items[1].travelDistanceKm, 4.5);
        assert.equal(new Date(saved.items[1].startTime).toISOString(), draft.items[1].startTime);
        assert.equal(saved.items[2].location.latitude, null, 'Custom activity must not invent coordinates');
        assert.equal(saved.packingItems[0].id, trip.packingItems[0].id);
        assert.equal(saved.packingItems[0].quantity, 2);
        assert.equal(saved.packingItems[0].isPacked, true);
        assert.equal(saved.collaborators[0].permission, 'view');
        assert.equal(await prisma.user_notifications.count({ where: { user_id: member.id, type: 'group_invite' } }), 1);
        await assert.rejects(() => savePlan(trip.id, member.id, draftOf(saved)), error => error.status === 403);
        await assert.rejects(() => savePlan(trip.id, outsider.id, draftOf(saved)), error => error.status === 403);

        const invalid = draftOf(saved);
        invalid.name = 'Must roll back';
        invalid.items = [{ customName: 'Invalid reference', day: 1, locationId: '999999999999' }];
        invalid.packingItems = [];
        await assert.rejects(() => savePlan(trip.id, owner.id, invalid));
        const unchanged = await getItineraryById(trip.id, owner.id);
        assert.equal(unchanged.name, saved.name);
        assert.deepEqual(unchanged.items.map(item => item.id), saved.items.map(item => item.id));
        assert.equal(unchanged.packingItems.length, 2);

        const editorDraft = draftOf(saved);
        editorDraft.collaborators = [{ userId: String(member.id), permission: 'edit' }];
        const editable = await savePlan(trip.id, owner.id, editorDraft);
        const memberDraft = draftOf(editable);
        delete memberDraft.collaborators; delete memberDraft.visibility;
        memberDraft.name = 'Edited by collaborator';
        assert.equal((await savePlan(trip.id, member.id, memberDraft)).name, 'Edited by collaborator');
        memberDraft.collaborators = [];
        await assert.rejects(() => savePlan(trip.id, member.id, memberDraft), error => error.status === 403);

        const cleared = draftOf(await getItineraryById(trip.id, owner.id));
        cleared.items = []; cleared.packingItems = []; cleared.collaborators = []; cleared.startDate = null; cleared.endDate = null;
        const empty = await savePlan(trip.id, owner.id, cleared);
        assert.deepEqual(empty.items, []); assert.deepEqual(empty.packingItems, []); assert.deepEqual(empty.collaborators, []);
        assert.equal(empty.startDate, null);
    } finally {
        if (trip) await deleteItinerary(trip.id, users[0].id);
        if (users.length) await prisma.users.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
        await prisma.$disconnect();
    }
});

test('Invalid dates, negative costs and foreign item IDs leave plan data intact', async () => {
    const owner = await prisma.users.findFirst();
    const trip = await createItinerary(owner.id, { name: 'Validation fixture', items: [{ customName: 'Keep activity' }] });
    const other = await createItinerary(owner.id, { name: 'Other fixture', items: [{ customName: 'Other activity' }] });
    try {
        for (const change of [
            { startDate: '2026-11-03T00:00:00Z', endDate: '2026-11-01T00:00:00Z' },
            { costMeals: -1 }, { travelerCount: 0 }, { items: [{ ...other.items[0], day: 1 }] },
            { items: [{ customName: 'Outside plan days', day: 2 }], totalDays: 1 },
            { collaborators: [{ email: 'missing-user@example.com', permission: 'edit' }] }
        ]) {
            await assert.rejects(() => savePlan(trip.id, owner.id, { ...draftOf(trip), ...change }), error => error.status === 400);
            assert.equal((await getItineraryById(trip.id, owner.id)).items[0].id, trip.items[0].id);
        }
    } finally {
        await deleteItinerary(trip.id, owner.id); await deleteItinerary(other.id, owner.id); await prisma.$disconnect();
    }
});
