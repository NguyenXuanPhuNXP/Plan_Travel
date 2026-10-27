import test from 'node:test';
import assert from 'node:assert/strict';
import * as itineraryService from '../src/services/itineraryService.js';
import prisma from '../src/config/db.js';

test('Migration Safety - Existing users and locations remain intact', async () => {
  // Check users count and data
  const users = await prisma.users.findMany();
  assert.ok(users.length >= 2, 'Existing users must not be lost after migration');

  const linh = users.find((u) => u.email === 'linh.le.wanderlust@gmail.com');
  assert.ok(linh, 'User Lê Hoàng Linh must exist');
  assert.equal(linh.full_name, 'Lê Hoàng Linh');

  const an = users.find((u) => u.email === 'an.nguyen.traveler@gmail.com');
  assert.ok(an, 'User Nguyễn Văn An must exist');
  assert.equal(an.full_name, 'Nguyễn Văn An');

  // Check locations
  const locations = await prisma.locations.findMany();
  assert.ok(locations.length >= 8, 'Existing locations must not be lost after migration');
  const swordLake = locations.find((l) => l.name.includes('Hồ Hoàn Kiếm'));
  assert.ok(swordLake, 'Hồ Hoàn Kiếm must exist in locations');
});

test('Migration Safety - Backward compatibility: trips without new fields load without error', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user);

  // Directly insert a legacy-style itinerary row with NULL/default values for all new columns
  const legacyRecord = await prisma.itineraries.create({
    data: {
      user_id: user.id,
      name: 'Chuyến Đi Cũ Thời Kỳ Đầu',
      destination: 'Đà Lạt',
      status: 'draft',
      budget: 3000000
      // traveler_count, transport_mode, cost fields omitted to simulate old data
    }
  });

  try {
    // Load through service
    const loaded = await itineraryService.getItineraryById(legacyRecord.id, user.id);
    assert.ok(loaded);
    assert.equal(loaded.name, 'Chuyến Đi Cũ Thời Kỳ Đầu');
    // Ensure default fallback values are safe
    assert.equal(loaded.travelerCount, 1, 'travelerCount should safely default to 1');
    assert.equal(loaded.costTransport, 0, 'costTransport should safely default to 0');
    assert.equal(loaded.totalCost, 3000000, 'totalCost should safely fall back to budget');
    assert.deepEqual(loaded.packingItems, [], 'packingItems should safely default to empty array');
    assert.deepEqual(loaded.items, [], 'items should safely default to empty array');

    // Ensure updating it doesn't crash
    const updated = await itineraryService.updateItinerary(legacyRecord.id, user.id, {
      travelerCount: 2,
      costTransport: 500000
    });
    assert.equal(updated.travelerCount, 2);
    assert.equal(updated.costTransport, 500000);
  } finally {
    await itineraryService.deleteItinerary(legacyRecord.id, user.id);
  }
});
