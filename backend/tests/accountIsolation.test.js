import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import * as itinerary from '../src/services/itineraryService.js';
import * as sharing from '../src/services/sharingService.js';
import * as friends from '../src/services/friendService.js';
import * as auth from '../src/services/authService.js';

test('Accounts isolate history, notifications and profiles; only the owner can add members', async () => {
    const ids = [];
    let trip;
    try {
        for (let i = 0; i < 3; i++) {
            const user = await prisma.users.create({ data: { full_name: `Isolation ${i}`, email: `isolation-${Date.now()}-${i}@example.com`, is_active: true } });
            ids.push(user.id);
        }
        const [owner, member, outsider] = ids;
        trip = await itinerary.createItinerary(owner, { name: 'Private isolation test', destination: 'Hà Nội' });
        assert.ok((await itinerary.getUserItineraries(owner)).some(item => item.id === trip.id));
        assert.deepEqual(await itinerary.getUserItineraries(member), []);
        assert.equal(await itinerary.getItineraryById(trip.id, outsider), null);
        await assert.rejects(() => sharing.addCollaborator(trip.id, outsider, { userId: String(member), permission: 'view' }), error => error.status === 403);
        const group = await sharing.addCollaborator(trip.id, owner, { userId: String(member), permission: 'view' });
        assert.ok(group.members.some(item => item.userId === String(member)));
        assert.ok((await itinerary.getUserItineraries(member)).some(item => item.id === trip.id));
        assert.deepEqual(await itinerary.getUserItineraries(outsider), []);
        assert.equal(await itinerary.getItineraryById(trip.id, outsider), null, 'Shared visibility must not grant arbitrary account access');
        await assert.rejects(() => sharing.getGroupMembers(trip.id, outsider), error => error.status === 403);
        await friends.sendFriendRequest(owner, { userId: String(member) });
        assert.equal((await friends.getNotifications(member)).friendRequests.length, 1);
        assert.deepEqual((await friends.getNotifications(owner)).friendRequests, []);
        assert.deepEqual((await friends.getNotifications(outsider)).notifications, []);
        assert.equal((await friends.searchUsers(member, 'isolation-')).find(item => item.id === String(owner)).requestStatus, 'received');
        const original = await auth.getUserProfile(member);
        await auth.updateUserProfile(member, { ...original, fullName: 'Updated private profile' });
        assert.equal((await auth.getUserProfile(member)).fullName, 'Updated private profile');
        assert.equal((await auth.getUserProfile(owner)).fullName, 'Isolation 0');
        await friends.acceptFriendRequest(member, String(owner));
        assert.deepEqual((await friends.getNotifications(member)).friendRequests, []);
    } finally {
        if (trip) await itinerary.deleteItinerary(trip.id, ids[0]);
        if (ids.length) await prisma.users.deleteMany({ where: { id: { in: ids } } });
        await prisma.$disconnect();
    }
});
