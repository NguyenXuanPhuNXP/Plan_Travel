import test from 'node:test';
import assert from 'node:assert/strict';
import * as itineraryService from '../src/services/itineraryService.js';
import prisma from '../src/config/db.js';

test('Checklist - Shared packing catalog is loaded with standard categories', async () => {
  const catalog = await itineraryService.getPackingCatalog();
  assert.ok(catalog.length >= 30, 'Catalog should contain at least 30 predefined items');

  const categories = [...new Set(catalog.map((i) => i.category))];
  assert.ok(categories.includes('clothing'), 'Catalog must include clothing category');
  assert.ok(categories.includes('devices'), 'Catalog must include devices category');
  assert.ok(categories.includes('tools'), 'Catalog must include tools category');
  assert.ok(categories.includes('documents'), 'Catalog must include documents category');
  assert.ok(categories.includes('medical'), 'Catalog must include medical category');

  const passport = catalog.find((i) => i.name.includes('Hộ chiếu') || i.name.includes('Căn cước'));
  assert.ok(passport, 'Must have passport/ID in catalog');
});

test('Checklist - Create itinerary with initial packing checklist', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user);

  const created = await itineraryService.createItinerary(user.id, {
    name: 'Checklist Trip Test',
    packingItems: [
      { itemName: 'Áo thun du lịch', category: 'clothing', quantity: 3, notes: 'Màu trắng' },
      { itemName: 'Sạc điện thoại Type-C', category: 'devices', quantity: 1, notes: 'Sạc nhanh 65W' },
      { itemName: 'Thuốc say xe', category: 'medical', quantity: 2, notes: 'Dạng viên' }
    ]
  });

  try {
    assert.equal(created.packingItems.length, 3);
    const shirt = created.packingItems.find((p) => p.itemName === 'Áo thun du lịch');
    assert.ok(shirt);
    assert.equal(shirt.quantity, 3);
    assert.equal(shirt.isPacked, false);
    assert.equal(shirt.notes, 'Màu trắng');
  } finally {
    await itineraryService.deleteItinerary(created.id, user.id);
  }
});

test('Checklist - Toggle isPacked, update quantity, add and delete items', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user);

  const created = await itineraryService.createItinerary(user.id, {
    name: 'Checklist Operations Test',
    packingItems: [
      { itemName: 'Mũ lưỡi trai', category: 'accessories', quantity: 1, notes: 'Màu đen' }
    ]
  });

  try {
    const item = created.packingItems[0];

    // 1. Mark as packed
    const updated = await itineraryService.updatePackingItem(created.id, item.id, user.id, {
      isPacked: true,
      quantity: 2
    });
    assert.equal(updated.isPacked, true);
    assert.equal(updated.quantity, 2);

    // 2. Add custom packing item
    const added = await itineraryService.addPackingItem(created.id, user.id, {
      itemName: 'Flycam Mini',
      category: 'devices',
      quantity: 1,
      notes: 'Đem kèm 2 pin dự phòng'
    });
    assert.equal(added.itemName, 'Flycam Mini');

    // Verify itinerary has 2 items now
    const reloaded = await itineraryService.getItineraryById(created.id, user.id);
    assert.equal(reloaded.packingItems.length, 2);

    // 3. Remove custom item
    await itineraryService.removePackingItem(created.id, added.id, user.id);
    const afterRemove = await itineraryService.getItineraryById(created.id, user.id);
    assert.equal(afterRemove.packingItems.length, 1);
  } finally {
    await itineraryService.deleteItinerary(created.id, user.id);
  }
});

test('Checklist - Cascade delete removes packing items when itinerary is deleted', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user);

  const created = await itineraryService.createItinerary(user.id, {
    name: 'Cascade Checklist Test',
    packingItems: [
      { itemName: 'Đồ bơi', category: 'clothing', quantity: 1 }
    ]
  });

  const packingItemId = BigInt(created.packingItems[0].id);
  await itineraryService.deleteItinerary(created.id, user.id);

  // Check database directly
  const found = await prisma.itinerary_packing_items.findUnique({
    where: { id: packingItemId }
  });
  assert.equal(found, null, 'Packing items should be cascade deleted when itinerary is deleted');
});
