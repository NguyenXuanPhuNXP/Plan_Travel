import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import prisma from '../src/config/db.js';
import communityRoutes from '../src/routes/community.js';
import { errorHandler } from '../src/middleware/errorMiddleware.js';
import { generateAccessToken } from '../src/services/jwtService.js';
import { createItinerary, deleteItinerary } from '../src/services/itineraryService.js';
import * as community from '../src/services/communityService.js';

test('Community filters apply before pagination and copying creates an independent private draft', async () => {
  const users = [];
  const trips = [];
  const locationIds = new Set();
  let server;
  const destination = `Community filters ${Date.now()}`;
  try {
    for (let index = 0; index < 2; index++) users.push(await prisma.users.create({ data: { email: `filters-${Date.now()}-${index}@example.test`, full_name: 'Filter test', is_active: true } }));
    const [owner, reader] = users;
    const source = await createItinerary(owner.id, {
      name: 'Shared route', destination, totalDays: 3, travelerCount: 2, transportMode: 'car', preferences: ['food', 'relax'],
      budget: 2000000, startDate: '2026-01-01T01:00:00Z', endDate: '2026-01-03T12:00:00Z',
      description: 'PRIVATE DESCRIPTION', packingItems: [{ name: 'PRIVATE PACKING' }], collaboratorIds: [String(reader.id)],
      items: [{ customName: 'Day one', day: 1, startTime: '2026-01-01T01:00:00Z', note: 'PRIVATE NOTE' },
        { customName: `Day three ${destination}`, day: 3, durationMinutes: 90, manualLocation: { name: `Point ${destination}`, latitude: 16.05, longitude: 108.2, address: 'Snapshot address' } }],
    });
    trips.push([source.id, owner.id]);
    locationIds.add(BigInt(source.items[1].locationId));
    const post = await community.createPost(owner.id, { itineraryId: source.id, title: 'Copy this route', destination, traveledOn: '2026-01-03' });
    assert.deepEqual(post.plan.preferences, ['food', 'relax']);
    assert.equal(post.plan.items[1].day, 3, 'An untimed stop keeps its scheduled day');
    await community.ratePost(post.id, reader.id, 4);
    for (const filters of [
      { preference: 'food' }, { companions: 'group' }, { transportMode: 'car' },
      { days: '3', maxBudget: '2000000', minRating: '4', preference: 'relax', companions: 'group', transportMode: 'car' },
    ]) {
      const result = await community.listPosts(null, undefined, { destination, ...filters });
      assert.deepEqual(result.posts.map(item => item.id), [post.id]);
    }
    for (const filters of [{ preference: 'food', companions: 'solo', transportMode: 'car' }, { preference: 'food', companions: 'group', transportMode: 'flight' }, { companions: 'solo' }, { days: '2' }, { maxBudget: '1999999' }, { minRating: '5' }, { preference: 'beach' }]) {
      assert.deepEqual((await community.listPosts(null, undefined, { destination, ...filters })).posts, []);
    }
    for (const filters of [{ days: '0' }, { days: '1.5' }, { maxBudget: '-1' }, { minRating: '6' }, { preference: 'unknown' }, { companions: 'unknown' }, { transportMode: 'unknown' }, { preference: ['food'] }, { transportMode: ['car'] }, { days: ['3'] }, { destination: ['x'] }]) {
      await assert.rejects(() => community.listPosts(null, undefined, filters), error => error.status === 400);
    }
    await prisma.itineraries.update({ where: { id: BigInt(source.id) }, data: { name: 'Changed private source', budget: 1 } });
    const app = express();
    app.use(express.json()); app.use('/community', communityRoutes); app.use(errorHandler);
    server = app.listen(0);
    await new Promise(resolve => server.on('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/community`;
    assert.equal((await fetch(`${base}/${post.id}/copy`, { method: 'POST' })).status, 401);
    const response = await fetch(`${base}/${post.id}/copy`, { method: 'POST', headers: { Authorization: `Bearer ${generateAccessToken(reader)}` } });
    assert.equal(response.status, 201);
    const copied = await response.json();
    trips.push([copied.id, reader.id]);
    for (const item of copied.items) if (item.locationId) locationIds.add(BigInt(item.locationId));
    assert.equal(copied.userId, String(reader.id));
    assert.equal(copied.name, 'Shared route (bản sao)');
    assert.equal(copied.status, 'draft'); assert.equal(copied.visibility, 'private');
    assert.equal(copied.budget, 2000000);
    assert.equal(copied.totalDays, 3);
    assert.deepEqual(copied.items.map(item => item.day), [1, 3]);
    assert.equal(copied.items[1].location.latitude, 16.05);
    assert.equal(copied.items[1].location.address, 'Snapshot address');
    assert.deepEqual(copied.packingItems, []); assert.deepEqual(copied.collaborators, []);
    assert.ok(!JSON.stringify(copied).includes('PRIVATE'));
    await prisma.itinerary_items.update({ where: { id: BigInt(copied.items[0].id) }, data: { custom_name: 'Edited copy' } });
    assert.equal((await community.getPost(post.id)).plan.items[0].name, 'Day one');
    const legacy = await prisma.trip_posts.create({ data: { user_id: owner.id, title: 'Legacy', destination, content: '', traveled_on: new Date('2026-01-01'), itinerary_snapshot: [] } });
    await assert.rejects(() => community.copyPostPlan(legacy.id, reader.id), error => error.status === 400);
    for (let index = 0; index < 23; index++) await prisma.trip_posts.create({ data: { user_id: owner.id, title: `Page ${index}`, destination, content: '', traveled_on: new Date('2026-01-01'), itinerary_snapshot: { ...post.plan, budget: index % 2 ? null : 2000000 } } });
    const first = await community.listPosts(null, undefined, { destination, days: '3' });
    assert.equal(first.posts.length, 20); assert.ok(first.nextCursor);
    const second = await community.listPosts(null, first.nextCursor, { destination, days: '3' });
    assert.equal(second.posts.length, 4);
    assert.equal(new Set([...first.posts, ...second.posts].map(item => item.id)).size, 24);
    const withBudget = await community.listPosts(null, undefined, { destination, maxBudget: '2000000' });
    assert.equal(withBudget.posts.length, 13, 'Unknown budgets never match the maximum budget');
    const endpoint = await fetch(`${base}?destination=${encodeURIComponent(destination)}&minRating=4&days=3`);
    assert.deepEqual((await endpoint.json()).posts.map(item => item.id), [post.id]);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.trip_posts.deleteMany({ where: { user_id: { in: users.map(user => user.id) } } });
    for (const [id, owner] of trips.reverse()) await deleteItinerary(id, owner);
    if (locationIds.size) await prisma.locations.deleteMany({ where: { id: { in: [...locationIds] } } });
    await prisma.users.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    await prisma.$disconnect();
  }
});
