import test from 'node:test';
import assert from 'node:assert/strict';
import { completeItineraryDays } from '../../frontend/src/utils/itineraryDays.js';

test('Itinerary includes empty days without losing existing stops or their order', () => {
  const stops = [{ id: 'second' }, { id: 'first' }];
  const result = completeItineraryDays([{ day: 3, items: stops }], 4);
  assert.deepEqual(result.map(group => group.day), [1, 2, 3, 4]);
  assert.equal(result[2].items, stops);
  assert.deepEqual(result[1].items, []);
  assert.equal(completeItineraryDays([], null).length, 1);
  assert.equal(completeItineraryDays([], 100000).length, 365);
  assert.equal(completeItineraryDays([{ day: 5, items: stops }], 2).at(-1).items, stops);
});
