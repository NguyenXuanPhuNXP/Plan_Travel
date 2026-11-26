import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPlanAdjustment, calculateTripCosts, estimateTravel, haversineDistanceKm, schedulePlan } from '../src/services/aiPlannerEngine.js';

test('AI planner uses real departure time plus estimated travel time', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationName: 'A', location: { name: 'A', latitude: 21, longitude: 105 }, durationMinutes: 60 }] }] }, {
        days: 1, departureTime: '08:00', startLocation: { latitude: 21, longitude: 105.3 }, transportMode: 'car'
    });
    assert.ok(haversineDistanceKm({ latitude: 21, longitude: 105 }, { latitude: 21, longitude: 105.3 }) > 0);
    assert.notEqual(plan.days[0].items[0].startTime, '08:00');
    assert.equal(plan.days[0].items[0].travelIsEstimated, true);
});

test('AI planner does not use a car route or car speed as a flight/train itinerary', () => {
    const flight = estimateTravel(500, 'flight');
    const localFlightTransfer = estimateTravel(12, 'flight');
    const train = estimateTravel(300, 'train');
    assert.equal(flight.isEstimated, true);
    assert.ok(flight.minutes < 200, 'long flight estimates include flight time plus a ground/airport allowance');
    assert.ok(localFlightTransfer.minutes < 60, 'short legs under a flight preference fall back to local-road speed');
    assert.ok(train.minutes < estimateTravel(300, 'car').minutes, 'rail fallback is not treated as a drive route');
});

test('AI planner limits activities and exposes actionable warnings', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({ locationName: `P${index}`, location: { name: `P${index}`, latitude: 16, longitude: 108 + index / 100 }, durationMinutes: 120 }));
    const plan = schedulePlan({ days: [{ dayNumber: 1, items }] }, { days: 1, maxStopsPerDay: 8 });
    assert.equal(plan.days[0].items.length, 8);
    assert.equal(plan.days[0].unassignedItems.length, 2, 'overflow stops remain available to add to another day');
    assert.equal(plan.feasibilityStatus, 'needs_adjustment');
    assert.ok(plan.warnings.some(warning => warning.reason.includes('Vượt giới hạn')));
    const recalculated = schedulePlan(plan, { days: 1, maxStopsPerDay: 8 });
    assert.equal(recalculated.days[0].items.length, 8);
    assert.equal(recalculated.days[0].unassignedItems.length, 2, 'recalculation preserves overflow suggestions');
});

test('AI planner does not count lodging toward the eight activity limit', () => {
    const items = Array.from({ length: 9 }, (_, index) => ({ locationName: `P${index}`, location: { name: `P${index}` }, durationMinutes: 30 }));
    items.splice(4, 0, { locationName: 'Khách sạn trung tâm', location: { name: 'Khách sạn trung tâm', category: 'accommodation', latitude: 16, longitude: 108 }, durationMinutes: 30 });
    const plan = schedulePlan({ days: [{ dayNumber: 1, items }] }, { days: 1, maxStopsPerDay: 8 });
    assert.equal(plan.days[0].items.length, 9);
    assert.equal(plan.days[0].items.filter(item => item.location?.category !== 'accommodation').length, 8);
    assert.equal(plan.days[0].unassignedItems.length, 1);
    assert.ok(plan.warnings.some(warning => warning.reason.includes('Vượt giới hạn 8')));
});

test('AI planner optimizes nearby stops while prioritizing a selected focus location', () => {
    const items = [
        { locationId: 'far', locationName: 'Xa', location: { id: 'far', name: 'Xa', latitude: 16.2, longitude: 108 } },
        { locationId: 'near', locationName: 'Gần', location: { id: 'near', name: 'Gần', latitude: 16.001, longitude: 108 } }
    ];
    const dayOne = schedulePlan({ days: [{ dayNumber: 1, items }] }, { days: 1, startLocation: { latitude: 16, longitude: 108 }, selectedLocationOrder: ['far', 'near'] });
    assert.equal(dayOne.days[0].items[0].locationId, 'far');
    const hotel = { locationName: 'Khách sạn', location: { name: 'Khách sạn', category: 'accommodation', latitude: 16, longitude: 108 }, durationMinutes: 30 };
    const optimized = schedulePlan({ days: [{ dayNumber: 1, items: [hotel] }, { dayNumber: 2, items }] }, { days: 2, startLocation: { latitude: 16, longitude: 108 } });
    assert.equal(optimized.days[1].items[0].locationId, 'near');
    const focused = schedulePlan({ days: [{ dayNumber: 1, items: [hotel] }, { dayNumber: 2, items }] }, { days: 2, startLocation: { latitude: 16, longitude: 108 }, focusLocationId: 'far' });
    assert.equal(focused.days[1].items[0].locationId, 'far');
});

test('day one starts activities after arrival from the departure location', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationId: 'first', locationName: 'Điểm đầu', location: { id: 'first', name: 'Điểm đầu', latitude: 21, longitude: 105 }, durationMinutes: 60 }] }] }, {
        days: 1,
        departureTime: '08:00',
        startLocation: { latitude: 21, longitude: 105.1 },
        routeEstimates: { '21.000000,105.100000>21.000000,105.000000': { minutes: 45, distanceKm: 12, isEstimated: false } }
    });
    assert.equal(plan.days[0].items[0].startTime, '08:45');
    assert.equal(plan.days[0].items[0].travelMinutesFromStart, 45);
});

test('AI planner never accepts a requested daily stop count above eight', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({ locationName: `P${index}`, location: { name: `P${index}` }, durationMinutes: 30 }));
    const plan = schedulePlan({ days: [{ dayNumber: 1, items }] }, { days: 1, maxStopsPerDay: 12 });
    assert.equal(plan.days[0].items.length, 8);
    assert.equal(plan.days[0].unassignedItems.length, 4);
    assert.ok(plan.warnings.some(warning => warning.reason.includes('Vượt giới hạn 8')));
});

test('AI planner separates per-person and fixed group costs', () => {
    const result = calculateTripCosts({ travelerCount: 3, costAllocation: { transport: 0, accommodation: 0, attractions: 100000, meals: 50000, contingency: 0 }, fixedCosts: 100000 });
    assert.equal(result.group.attractions, 300000);
    assert.equal(result.group.meals, 150000);
    assert.equal(result.group.fixed, 100000);
    assert.equal(result.group.total, 550000);
});

test('AI supplied group costs are not multiplied a second time', () => {
    const result = calculateTripCosts({
        travelerCount: 3,
        costScope: 'GROUP',
        costAllocation: { transport: 150000, accommodation: 500000, meals: 300000, attractions: 300000, contingency: 100000 }
    });
    assert.equal(result.group.total, 1350000);
    assert.equal(result.group.perPerson, 450000);
    assert.equal(result.perPerson.attractions, 100000);
});

test('AI cost totals remain unknown when prices are missing and warn against the budget', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationName: 'A', location: { name: 'A' }, durationMinutes: 60 }] }] }, {
        days: 1, travelerCount: 2, budget: 100000,
        costAllocation: { transport: null, accommodation: null, meals: null, attractions: null, contingency: null }
    });
    assert.equal(plan.costSummary.total, null);
    assert.deepEqual(plan.costEstimates.unknownCategories, ['transport', 'accommodation', 'meals', 'attractions', 'contingency']);
    assert.ok(plan.warnings.some(item => item.reason.includes('Chưa đủ dữ liệu giá')));
});

test('route API estimates are labeled as actual routes and used for first departure leg', () => {
    const startLocation = { latitude: 21, longitude: 105.3 };
    const location = { name: 'A', latitude: 21, longitude: 105 };
    const routeKey = '21.000000,105.300000>21.000000,105.000000';
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationName: 'A', location, durationMinutes: 60 }] }] }, {
        days: 1, departureTime: '08:00', startLocation,
        routeEstimates: { [routeKey]: { minutes: 45, distanceKm: 18.2, isEstimated: false } }
    });
    assert.equal(plan.days[0].items[0].startTime, '08:45');
    assert.equal(plan.days[0].items[0].travelIsEstimated, false);
    assert.equal(plan.days[0].items[0].travelMinutesFromStart, 45);
});

test('AI waits until a known opening time instead of starting activities while closed', () => {
    const startLocation = { latitude: 21, longitude: 105.1 };
    const location = { name: 'Bảo tàng', latitude: 21, longitude: 105, openingHours: '09:00-17:00' };
    const routeKey = '21.000000,105.100000>21.000000,105.000000';
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationName: 'Bảo tàng', location, durationMinutes: 60 }] }] }, {
        days: 1, departureTime: '08:00', startLocation,
        routeEstimates: { [routeKey]: { minutes: 30, distanceKm: 12, isEstimated: false } }
    });
    assert.equal(plan.days[0].items[0].startTime, '09:00');
    assert.equal(plan.days[0].items[0].waitingMinutes, 30);
});

test('AI uses the previous night accommodation as the next day origin', () => {
    const hotel = { name: 'Khách sạn', category: 'accommodation', latitude: 16, longitude: 108 };
    const plan = schedulePlan({ days: [
        { dayNumber: 1, items: [
            { locationName: 'Điểm cuối', location: { name: 'Điểm cuối', latitude: 16.01, longitude: 108 }, durationMinutes: 30 },
            { locationName: 'Khách sạn', location: hotel, durationMinutes: 30 }
        ] },
        { dayNumber: 2, items: [{ locationName: 'Điểm sáng', location: { name: 'Điểm sáng', latitude: 16.01, longitude: 108 }, durationMinutes: 30 }] }
    ] }, { days: 2 });
    assert.ok(plan.days[1].items[0].travelMinutesFromPrevious > 0);
    assert.ok(!plan.warnings.some(item => item.day === 2 && item.reason.includes('Chưa có nơi lưu trú')));
});

test('AI gives an overnight stay a full rest window and carries it to the next departure', () => {
    const hotel = { name: 'Khách sạn', category: 'accommodation', latitude: 16, longitude: 108 };
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [
        { locationName: 'Điểm cuối', location: { name: 'Điểm cuối', latitude: 16.01, longitude: 108 }, durationMinutes: 30 },
        { locationName: 'Khách sạn', location: hotel, durationMinutes: 30 }
    ] }, { dayNumber: 2, items: [{ locationName: 'Điểm sáng', location: { name: 'Điểm sáng', latitude: 16.02, longitude: 108 }, durationMinutes: 30 }] }] }, {
        days: 2, startLocation: { latitude: 16, longitude: 108 }
    });
    const stay = plan.days[0].items.find(item => item.locationName === 'Khách sạn');
    assert.equal(stay.isOvernightStay, true);
    assert.equal(stay.overnightRestMinutes, 480);
    assert.equal(stay.startTime, '18:00');
    assert.equal(stay.endTime, '21:30');
    assert.equal(stay.overnightRestContinuesNextDay, true);
    assert.ok(plan.days[1].items[0].travelMinutesFromPrevious > 0);
});

test('AI does not schedule an activity past 21:30 of the day', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [
        { locationName: 'Điểm tối', location: { name: 'Điểm tối', latitude: 16, longitude: 108 }, durationMinutes: 120 }
    ] }] }, { days: 1, departureTime: '22:30', startLocation: { latitude: 16, longitude: 108 } });
    const item = plan.days[0].items[0];
    assert.equal(item.startTime, null);
    assert.equal(item.endTime, null);
    assert.match(item.scheduleConflict, /21:30/);
});

test('AI moves a late activity to the next day when another day is available', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [
        { locationId: 'late', locationName: 'Điểm muộn', location: { id: 'late', name: 'Điểm muộn', latitude: 16, longitude: 108 }, durationMinutes: 120 },
        { locationId: 'hotel', locationName: 'Khách sạn', location: { id: 'hotel', name: 'Khách sạn', category: 'accommodation', latitude: 16, longitude: 108 }, durationMinutes: 30 }
    ] }, { dayNumber: 2, items: [] }] }, {
        days: 2,
        departureTime: '22:30',
        startLocation: { latitude: 16, longitude: 108 }
    });
    assert.equal(plan.days[0].items.some(item => item.locationId === 'late'), false);
    assert.equal(plan.days[1].items[0].locationId, 'late');
    assert.equal(plan.days[1].items[0].movedFromDay, 1);
    assert.equal(plan.days[1].items[0].movedToDay, 2);
    assert.ok(plan.days[1].items[0].startTime);
});

test('AI marks more-than-half-day travel with a transport alternative and user choices', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationName: 'Xa', location: { name: 'Xa', latitude: 10, longitude: 10 }, durationMinutes: 60 }] }] }, {
        days: 1, startLocation: { latitude: 0, longitude: 0 }, transportMode: 'car'
    });
    const warning = plan.warnings.find(item => item.location === 'Xa');
    assert.equal(warning.longTravel, true);
    assert.equal(warning.suggestedTransport, 'flight');
    assert.match(warning.reason, /nửa ngày|một ngày/);
});

test('AI flags when no departure location is available without inventing coordinates', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [{ locationName: 'A', location: { name: 'A' }, durationMinutes: 60 }] }] }, { days: 1 });
    assert.ok(plan.warnings.some(item => item.reason.includes('Chưa có vị trí khởi hành')));
    assert.equal(plan.days[0].items[0].startTime, null);
    assert.ok(plan.days[0].items[0].scheduleConflict);
    assert.equal(plan.days[0].items[0].travelMinutesFromStart, null);
});

test('AI planner exposes per-day costs as unknown when shared categories are not allocated to dates', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [
        { locationName: 'A', location: { name: 'A', latitude: 21, longitude: 105, estimatedCost: 100000 }, durationMinutes: 60 }
    ] }] }, { days: 1 });
    assert.equal(plan.costSummary.daily[0].categories.attractions, 100000);
    assert.equal(plan.costSummary.daily[0].total, null);
    assert.ok(plan.costSummary.daily[0].unknownCategories.includes('transport'));
});

test('AI planner calculates person, room-capacity, group and fixed cost lines without double counting', () => {
    const result = calculateTripCosts({
        travelerCount: 3,
        dayCount: 3,
        costScope: 'GROUP',
        costAllocation: { transport: null, accommodation: null, meals: null, attractions: null, contingency: null },
        costBreakdown: [
            { category: 'transport', costType: 'PERSON', description: 'Vé xe', unitPrice: 100000, dayNumber: 1 },
            { category: 'accommodation', costType: 'ROOM', description: 'Phòng', unitPrice: 500000, capacity: 2, nights: 2, dayNumber: 1 },
            { category: 'meals', costType: 'GROUP', description: 'Thuê bàn', unitPrice: 50000, quantity: 1, dayNumber: 1 },
            { category: 'attractions', costType: 'PERSON', description: 'Vé vào cổng', unitPrice: 100000, dayNumber: 2 },
            { category: 'contingency', costType: 'FIXED', description: 'Phí gửi xe', unitPrice: 100000, dayNumber: 1 }
        ]
    });
    assert.equal(result.group.transport, 300000);
    assert.equal(result.group.accommodation, 2000000);
    assert.equal(result.group.meals, 50000);
    assert.equal(result.group.attractions, 300000);
    assert.equal(result.group.contingency, 100000);
    assert.equal(result.group.fixed, 100000);
    assert.equal(result.group.total, 2750000);
    assert.equal(result.daily[0].categories.accommodation, 1000000);
    assert.equal(result.daily[1].categories.accommodation, 1000000);
    assert.equal(result.daily[1].categories.attractions, 300000);
    assert.equal(result.daily[0].total, 1450000);
    assert.equal(result.daily[1].total, 1300000);
});

test('AI planner keeps accommodation cost unknown when room capacity is unavailable', () => {
    const result = calculateTripCosts({
        travelerCount: 3,
        dayCount: 3,
        costAllocation: { transport: 0, accommodation: null, meals: 0, attractions: 0, contingency: 0 },
        costBreakdown: [{ category: 'accommodation', costType: 'ROOM', description: 'Khách sạn', unitPrice: 500000, nights: 2 }]
    });
    assert.equal(result.group.accommodation, null);
    assert.equal(result.group.total, null);
    assert.ok(result.unknownCategories.includes('accommodation'));
});

test('AI planner keeps room cost unknown when the number of nights is missing', () => {
    const result = calculateTripCosts({
        travelerCount: 2,
        dayCount: 3,
        costAllocation: { transport: 0, accommodation: null, meals: 0, attractions: 0, contingency: 0 },
        costBreakdown: [{ category: 'accommodation', costType: 'ROOM', description: 'Khách sạn', unitPrice: 500000, capacity: 2 }]
    });
    assert.equal(result.group.accommodation, null);
    assert.equal(result.group.total, null);
    assert.ok(result.unknownCategories.includes('accommodation'));
});

test('AI planner retains closed attractions as unscheduled conflicts for user confirmation', () => {
    const plan = schedulePlan({ days: [{ dayNumber: 1, items: [
        { locationName: 'Nhà lưu niệm Võ Thị Sáu', location: { name: 'Nhà lưu niệm Võ Thị Sáu', latitude: 9.3, longitude: 105.4 }, durationMinutes: 120 },
        { locationName: 'Địa điểm buổi tối', location: { name: 'Địa điểm buổi tối', latitude: 9.31, longitude: 105.41 }, durationMinutes: 60 }
    ] }] }, { days: 1, departureTime: '21:00', startLocation: { latitude: 9.3, longitude: 105.4 } });
    const conflict = plan.days[0].items.find(item => item.locationName === 'Nhà lưu niệm Võ Thị Sáu');
    assert.ok(conflict, 'the stop remains in the plan instead of being silently removed');
    assert.equal(conflict.startTime, null);
    assert.ok(conflict.scheduleConflict);
    assert.equal(plan.days[0].items[0].locationName, 'Địa điểm buổi tối');
    assert.ok(plan.warnings.some(item => item.location === 'Nhà lưu niệm Võ Thị Sáu' && item.reason.includes('giờ mở cửa')));
});

test('AI warning adjustments preview a removal or move and enforce the destination day limit', () => {
    const plan = { days: [
        { dayNumber: 1, items: [{ locationId: 'a', locationName: 'A' }, { locationId: 'b', locationName: 'B' }] },
        { dayNumber: 2, items: [{ locationId: 'c', locationName: 'C' }] }
    ] };
    const moved = applyPlanAdjustment(plan, { action: 'move_item_next_day', dayNumber: 1, locationId: 'a', maxStopsPerDay: 2 });
    assert.deepEqual(moved.days.map(day => day.items.map(item => item.locationId)), [['b'], ['c', 'a']]);
    const removed = applyPlanAdjustment(plan, { action: 'remove_item', dayNumber: 1, locationName: 'A' });
    assert.deepEqual(removed.days[0].items.map(item => item.locationId), ['b']);
    assert.throws(() => applyPlanAdjustment(plan, { action: 'move_item_next_day', dayNumber: 1, locationId: 'b', maxStopsPerDay: 1 }), /đủ số địa điểm tối đa/);
    assert.equal(plan.days[0].items.length, 2, 'preview must not mutate the source plan');
});

test('AI adjustment recalculates linked stop costs and invalidates stale category totals', () => {
    const plan = {
        days: [{ dayNumber: 1, items: [
            { locationId: 'a', locationName: 'A', location: { id: 'a', name: 'A', estimatedCost: 100000 } },
            { locationId: 'b', locationName: 'B', location: { id: 'b', name: 'B', estimatedCost: 200000 } }
        ] }],
        costScope: 'GROUP',
        costAllocation: { transport: 0, accommodation: 0, meals: 0, attractions: 900000, contingency: 0 },
        costBreakdown: [{ category: 'attractions', costType: 'PERSON', description: 'Vé A', unitPrice: 100000, locationId: 'a', dayNumber: 1 }]
    };
    const revised = applyPlanAdjustment(plan, { action: 'remove_item', dayNumber: 1, locationId: 'a' });
    const recalculated = schedulePlan(revised, { days: 1, travelerCount: 3 });
    assert.equal(revised.costBreakdown.length, 0);
    assert.equal(recalculated.costSummary.attractions, 600000);
    assert.equal(recalculated.costSummary.total, 600000);
});
