import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAiPlannerInput } from '../src/services/aiPlannerInput.js';
import { aiTripDates, aiPlanItems } from '../../frontend/src/utils/aiPlan.js';
import { aiPlanCosts, aiPlanDescription, getPlanDayWarnings } from '../../frontend/src/utils/aiPlanDetails.js';

test('AI budget is for the entire group and advisory details survive saving', () => {
    const input = parseAiPlannerInput({ region: 'Hanoi', budget: 10000000, travelerCount: 4, startDate: '2026-12-01', endDate: '2026-12-03', transportMode: 'train' });
    assert.equal(input.budget, 10000000);
    assert.equal(input.travelerCount, 4);
    assert.equal(input.startDate, '2026-12-01');
    const plan = { description: 'Trip', transport: 'Train', accommodation: 'Two rooms', weather: 'No verified forecast', risks: ['Check tickets'], costAllocation: { transport: 2000000, accommodation: 3000000, meals: 2000000, attractions: 2000000, contingency: 1000000 } };
    assert.equal(aiPlanCosts(plan).totalCost, input.budget);
    assert.equal(aiPlanCosts(plan).costAccommodation, 3000000);
    assert.deepEqual(aiPlanCosts(null), {});
    for (const value of ['Train', 'Two rooms', 'No verified forecast', 'Check tickets']) assert.ok(aiPlanDescription(plan).includes(value));
    for (const changes of [{ travelerCount: 0 }, { travelerCount: 101 }, { startDate: '2026-02-30' }, { startDate: '2026-11-03', endDate: '2026-11-01' }, { transportMode: 'invalid' }]) {
        assert.throws(() => parseAiPlannerInput({ region: 'Hanoi', ...changes }), error => error.status === 400);
    }
});

test('AI requests normalize selected IDs, preserve zero budget and reject invalid inputs before generation', () => {
    const result = parseAiPlannerInput({ region: ' Hà Nội ', days: '3', budget: 0, selectedLocationIds: [1, '1', '2'], preferences: ['food'] });
    assert.equal(result.region, 'Hà Nội');
    assert.equal(result.budget, 0);
    assert.deepEqual(result.selectedLocationIds, ['1', '2']);
    for (const changes of [{ region: ' ' }, { days: 0 }, { days: 31 }, { days: 1.5 }, { budget: -1 }, { budget: 'bad' }, { preferences: 'food' }, { selectedLocationIds: ['bad-id'] }, { focusLocationId: 'bad' }]) {
        assert.throws(() => parseAiPlannerInput({ region: 'Hà Nội', ...changes }), error => error.status === 400);
    }
});

test('AI requests require a departure date from today and enforce the eight-stop daily maximum', () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const pad = value => String(value).padStart(2, '0');
    const yesterday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    assert.throws(() => parseAiPlannerInput({ region: 'Hà Nội', startDate: yesterday, endDate: yesterday }), error => error.status === 400 && /Ngày xuất phát/.test(error.message));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureEnd = new Date(futureDate);
    futureEnd.setDate(futureEnd.getDate() + 2);
    const future = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const result = parseAiPlannerInput({ region: 'Hà Nội', startDate: future(futureDate), endDate: future(futureEnd), maxStopsPerDay: 8 });
    assert.equal(result.maxStopsPerDay, 8);
    assert.throws(() => parseAiPlannerInput({ region: 'Hà Nội', maxStopsPerDay: 9 }), error => error.status === 400 && /1 đến 8/.test(error.message));
});

test('AI planner rejects blank departure coordinates without treating them as zero', () => {
    for (const startLocation of [
        { name: 'Unknown', latitude: '', longitude: '' },
        { name: 'Unknown', latitude: null, longitude: 105 },
        { name: 'Unknown', latitude: 21, longitude: '' }
    ]) {
        assert.throws(
            () => parseAiPlannerInput({ region: 'Hà Nội', startLocation }),
            error => error.status === 400 && error.message.includes('Tọa độ')
        );
    }
    assert.deepEqual(parseAiPlannerInput({ region: 'Hà Nội', startLocation: { latitude: 0, longitude: 0 } }).startLocation, {
        name: '', address: '', latitude: 0, longitude: 0
    });
});

test('Manual timeline edits warn about overlaps, insufficient travel gaps, and ignore lodging in the stop limit', () => {
    const warnings = getPlanDayWarnings({ items: [
        { locationName: 'A', startTime: '08:00', endTime: '09:00', travelMinutesToNext: 30 },
        { locationName: 'B', startTime: '09:20', endTime: '10:00', travelMinutesToNext: 15 },
        { locationName: 'C', startTime: '09:50', endTime: '10:30' },
        { locationName: 'Khách sạn', category: 'accommodation', startTime: '18:00', endTime: '21:00' },
        { locationName: 'D', startTime: '21:00', endTime: '21:45' }
    ] }, { maxStopsPerDay: 4 });
    assert.ok(warnings.some(message => message.includes('chưa đủ 30 phút di chuyển')));
    assert.ok(warnings.some(message => message.includes('chồng lấn')));
    assert.ok(warnings.some(message => message.includes('sau 21:30')));
    assert.ok(!warnings.some(message => message.includes('vượt giới hạn')));
});

test('AI plan persistence uses real trip dates and keeps custom activities, duration and zero travel time', () => {
    const dates = aiTripDates('2026-11-10', '', 3);
    assert.deepEqual(dates, { startDate: '2026-11-10', endDate: '2026-11-12' });
    const plan = { days: [
        { dayNumber: 1, items: [{ locationId: '12', locationName: 'Lake', startTime: '08:30', endTime: '10:00', note: 'Walk', travelMinutesToNext: 0 }] },
        { dayNumber: 3, items: [{ locationName: 'My own dinner', startTime: '23:30', endTime: '00:30', note: 'Personal activity' }] }
    ] };
    const items = aiPlanItems(plan, dates.startDate);
    assert.equal(items.length, 2);
    assert.equal(items[1].locationId, null);
    assert.equal(items[1].customName, 'My own dinner');
    assert.equal(new Date(items[1].startTime).getDate(), 12);
    assert.equal(new Date(items[1].endTime).getDate(), 13);
    assert.equal(new Date(items[0].startTime).getFullYear(), 2026);
    assert.equal(new Date(items[0].startTime).getHours(), 8);
    assert.equal(items[0].durationMinutes, 90);
    assert.equal(items[0].travelMinutes, 0);
    assert.match(items[1].note, /^\[DAY:3\]/);
    assert.throws(() => aiTripDates('2026-11-12', '2026-11-10', 3));
    assert.throws(() => aiPlanItems({ days: [{ items: [{ locationName: 'Bad clock', startTime: '26:00' }] }] }, dates.startDate));
});
