import test from 'node:test';
import assert from 'node:assert/strict';
import * as itineraryService from '../src/services/itineraryService.js';
import prisma from '../src/config/db.js';

test('Packing Catalog - Contains at least 60 items across all standard travel categories', async () => {
  const catalog = await itineraryService.getPackingCatalog();
  assert.ok(catalog.length >= 60, `Catalog should have >= 60 items, got ${catalog.length}`);

  const categories = [...new Set(catalog.map((i) => i.category))];
  assert.ok(categories.includes('clothing'), 'Missing clothing');
  assert.ok(categories.includes('devices'), 'Missing devices');
  assert.ok(categories.includes('tools'), 'Missing tools');
  assert.ok(categories.includes('accessories'), 'Missing accessories');
  assert.ok(categories.includes('documents'), 'Missing documents');
  assert.ok(categories.includes('medical'), 'Missing medical');

  // Verify essential travel items exist
  const hasPowerBank = catalog.some((i) => i.name.toLowerCase().includes('sạc dự phòng'));
  const hasID = catalog.some((i) => i.name.toLowerCase().includes('căn cước') || i.name.toLowerCase().includes('hộ chiếu'));
  const hasMedicine = catalog.some((i) => i.name.toLowerCase().includes('say xe') || i.name.toLowerCase().includes('hạ sốt'));

  assert.ok(hasPowerBank, 'Must include power bank');
  assert.ok(hasID, 'Must include citizen ID or passport');
  assert.ok(hasMedicine, 'Must include common medicine');
});

test('Trip History & Serialization - Itinerary returns title, name, locations, items, and resolved budget', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user, 'A test user must exist');

  const testTrip = await itineraryService.createItinerary(user.id, {
    name: 'Chuyến đi Quy Nhơn 3N2Đ',
    destination: 'Quy Nhơn',
    totalDays: 3,
    budget: 3500000,
    costScope: 'PERSON',
    costTransport: 1000000,
    costMeals: 1000000,
    costAttractions: 500000,
    costAccommodation: 800000,
    costContingency: 200000,
    packingItems: [
      { itemName: 'Kem chống nắng', category: 'tools', quantity: 1 }
    ]
  });

  try {
    // 1. Check create response serialization
    assert.equal(testTrip.name, 'Chuyến đi Quy Nhơn 3N2Đ');
    assert.equal(testTrip.title, 'Chuyến đi Quy Nhơn 3N2Đ');
    assert.ok(Array.isArray(testTrip.locations));
    assert.ok(Array.isArray(testTrip.items));
    assert.equal(typeof testTrip.budget, 'number');
    assert.equal(testTrip.budget, 3500000);

    // 2. Check getUserItineraries serialization for TripHistory
    const userTrips = await itineraryService.getUserItineraries(user.id);
    const found = userTrips.find((t) => String(t.id) === String(testTrip.id));
    assert.ok(found, 'Created trip must appear in user itineraries for TripHistory');
    assert.equal(found.title, 'Chuyến đi Quy Nhơn 3N2Đ');
    assert.equal(found.name, 'Chuyến đi Quy Nhơn 3N2Đ');
    assert.ok(Array.isArray(found.locations));
    assert.ok(Array.isArray(found.items));
    assert.equal(typeof found.budget, 'number');

    // 3. Test adding pre-defined and custom items into existing itinerary
    const addedItem = await itineraryService.addPackingItem(testTrip.id, user.id, {
      itemName: 'Sạc điện thoại đa năng',
      category: 'devices',
      quantity: 2,
      notes: 'Mang theo cáp dù'
    });
    assert.ok(addedItem.id);
    assert.equal(addedItem.itemName, 'Sạc điện thoại đa năng');
    assert.equal(addedItem.quantity, 2);

    // 4. Test removing packing item
    await itineraryService.removePackingItem(testTrip.id, addedItem.id, user.id);
    const freshTrip = await itineraryService.getItineraryById(testTrip.id, user.id);
    assert.ok(!freshTrip.packingItems.some((p) => String(p.id) === String(addedItem.id)));
  } finally {
    await itineraryService.deleteItinerary(testTrip.id, user.id);
  }
});
