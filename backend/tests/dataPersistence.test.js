import test from 'node:test';
import assert from 'node:assert/strict';
import * as itineraryService from '../src/services/itineraryService.js';
import prisma from '../src/config/db.js';

test('Data Persistence - Save and Load complete manual trip plan', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user);

  const loc = await prisma.locations.findFirst();
  assert.ok(loc);

  const newPlan = {
    name: 'Hành Trình Xuyên Việt 5 Ngày',
    destination: 'Đà Nẵng - Hội An',
    startLocation: 'Hà Nội',
    endLocation: 'Hội An',
    startDate: '2026-12-01T07:00:00.000Z',
    endDate: '2026-12-05T21:00:00.000Z',
    totalDays: 5,
    travelerCount: 4,
    transportMode: 'flight',
    costScope: 'PERSON',
    costTransport: 1200000,
    costMeals: 800000,
    costAttractions: 400000,
    costAccommodation: 1000000,
    costContingency: 200000,
    preferences: ['beach', 'food', 'culture', 'photography'],
    description: 'Chuyến du lịch gia đình cuối năm',
    items: [
      {
        locationId: loc.id.toString(),
        startTime: '2026-12-01T08:00:00.000Z',
        durationMinutes: 90,
        travelMinutes: 25,
        note: 'Tham quan buổi sáng'
      },
      {
        customName: 'Ăn trưa mỳ Quảng ếch',
        startTime: '2026-12-01T11:30:00.000Z',
        durationMinutes: 60,
        travelMinutes: 15,
        note: 'Thưởng thức món ngon đặc sản'
      },
      {
        customName: 'Nghỉ ngơi tại khách sạn & Tắm biển Mỹ Khê',
        startTime: '2026-12-01T15:00:00.000Z',
        durationMinutes: 120,
        travelMinutes: 10,
        note: 'Mang theo kem chống nắng'
      }
    ],
    packingItems: [
      { itemName: 'Đồ bơi & Kính bơi', category: 'clothing', quantity: 4, notes: 'Mỗi người 1 bộ' },
      { itemName: 'Kem chống nắng toàn thân', category: 'tools', quantity: 2, notes: 'SPF 50+' },
      { itemName: 'Máy ảnh Sony + Lens', category: 'devices', quantity: 1, notes: 'Pin sạc đầy' }
    ]
  };

  // 1. Create
  const created = await itineraryService.createItinerary(user.id, newPlan);
  try {
    assert.ok(created.id);
    assert.equal(created.name, 'Hành Trình Xuyên Việt 5 Ngày');
    assert.equal(created.travelerCount, 4);
    assert.equal(created.transportMode, 'flight');
    assert.equal(created.costScope, 'PERSON');
    // Per person sum = 3,600,000 * 4 = 14,400,000
    assert.equal(created.totalCost, 14400000);

    // 2. Load by ID
    const loaded = await itineraryService.getItineraryById(created.id, user.id);
    assert.ok(loaded);
    assert.equal(loaded.items.length, 3);
    assert.equal(loaded.packingItems.length, 3);

    // Verify hourly schedule item properties
    const item1 = loaded.items[0];
    assert.equal(item1.locationId, loc.id.toString());
    assert.equal(item1.durationMinutes, 90);
    assert.equal(item1.travelMinutes, 25);

    const item2 = loaded.items[1];
    assert.equal(item2.customName, 'Ăn trưa mỳ Quảng ếch');
    assert.equal(item2.durationMinutes, 60);
    assert.equal(item2.travelMinutes, 15);

    // Verify preferences JSON array
    assert.deepEqual(loaded.preferences, ['beach', 'food', 'culture', 'photography']);

    // 3. Verify user itineraries list includes this trip
    const userTrips = await itineraryService.getUserItineraries(user.id);
    const foundInList = userTrips.find((t) => t.id === created.id);
    assert.ok(foundInList, 'Trip should appear in user itineraries list');
    assert.equal(foundInList.totalCost, 14400000);
  } finally {
    // 4. Delete
    await itineraryService.deleteItinerary(created.id, user.id);
    const afterDelete = await itineraryService.getItineraryById(created.id, user.id);
    assert.equal(afterDelete, null, 'Deleted trip should not be found');
  }
});
