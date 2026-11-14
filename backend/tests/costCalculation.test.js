import test from 'node:test';
import assert from 'node:assert/strict';
import * as itineraryService from '../src/services/itineraryService.js';
import prisma from '../src/config/db.js';

test('Cost Calculation - Per Person scope calculation with multiplier', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user, 'A test user must exist in the database');

  const tripData = {
    name: 'Test Chi Phí Theo Đầu Người',
    destination: 'Nha Trang',
    travelerCount: 3,
    costScope: 'PERSON',
    costTransport: 1000000,
    costMeals: 500000,
    costAttractions: 300000,
    costAccommodation: 700000,
    costContingency: 200000
    // Sum per person = 2,700,000. Total for 3 people = 8,100,000
  };

  const created = await itineraryService.createItinerary(user.id, tripData);
  try {
    assert.equal(created.travelerCount, 3);
    assert.equal(created.costScope, 'PERSON');
    assert.equal(created.costTransport, 1000000);
    assert.equal(created.costMeals, 500000);
    assert.equal(created.costAttractions, 300000);
    assert.equal(created.costAccommodation, 700000);
    assert.equal(created.costContingency, 200000);
    assert.equal(created.totalCost, 8100000, 'Total cost should be perPersonSum * 3');
    assert.equal(created.budget, 8100000, 'Budget should default to totalCost if not provided');
  } finally {
    await itineraryService.deleteItinerary(created.id, user.id);
  }
});

test('Cost Calculation - Group scope calculation without multiplier', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user, 'A test user must exist in the database');

  const tripData = {
    name: 'Test Chi Phí Cả Đoàn',
    destination: 'Sa Pa',
    travelerCount: 5,
    costScope: 'GROUP',
    costTransport: 2000000,
    costMeals: 1500000,
    costAttractions: 500000,
    costAccommodation: 3000000,
    costContingency: 1000000
    // Sum group = 8,000,000 (not multiplied by 5)
  };

  const created = await itineraryService.createItinerary(user.id, tripData);
  try {
    assert.equal(created.travelerCount, 5);
    assert.equal(created.costScope, 'GROUP');
    assert.equal(created.totalCost, 8000000, 'Total cost should be group sum without multiplier');
  } finally {
    await itineraryService.deleteItinerary(created.id, user.id);
  }
});

test('Cost Calculation - Dynamic update when changing traveler count', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user, 'A test user must exist in the database');

  const tripData = {
    name: 'Test Cập Nhật Số Lượng Người',
    destination: 'Phú Quốc',
    travelerCount: 2,
    costScope: 'PERSON',
    costTransport: 500000,
    costMeals: 500000
    // Sum per person = 1,000,000. Total for 2 = 2,000,000
  };

  const created = await itineraryService.createItinerary(user.id, tripData);
  try {
    assert.equal(created.totalCost, 2000000);

    // Update traveler count to 6
    const updated = await itineraryService.updateItinerary(created.id, user.id, {
      travelerCount: 6
    });

    assert.equal(updated.travelerCount, 6);
    assert.equal(updated.totalCost, 6000000, 'Total cost should automatically recalculate to 6 * 1M');
  } finally {
    await itineraryService.deleteItinerary(created.id, user.id);
  }
});

test('Cost Calculation - Handles zero and negative values safely', async () => {
  const user = await prisma.users.findFirst();
  assert.ok(user, 'A test user must exist in the database');

  const tripData = {
    name: 'Test Giá Trị 0',
    destination: 'Huế',
    travelerCount: -5, // Invalid, should default to 1
    costScope: 'PERSON',
    costTransport: -100, // Invalid, should default to 0
    costMeals: 0
  };

  const created = await itineraryService.createItinerary(user.id, tripData);
  try {
    assert.equal(created.travelerCount, 1);
    assert.equal(created.costTransport, 0);
    assert.equal(created.totalCost, 0);
  } finally {
    await itineraryService.deleteItinerary(created.id, user.id);
  }
});
