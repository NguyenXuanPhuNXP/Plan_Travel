import test from 'node:test';
import assert from 'node:assert/strict';
import { tripSetupPayload } from '../../frontend/src/utils/tripSetup.js';
import { readFile } from 'node:fs/promises';

const info = { name: '', destination: ' Đà Nẵng ', startDate: '2026-12-01', endDate: '2026-12-03', travelerCount: 1, preferences: [], transportMode: '' };
test('New trip starts with selected dates and companions, no automatic stops or costs', () => {
  const plan = tripSetupPayload(info, ['2', '3']);
  assert.equal(plan.name, 'Chuyến đi Đà Nẵng');
  assert.equal(plan.totalDays, 3);
  assert.equal(plan.travelerCount, 3);
  assert.equal(new Date(plan.startDate).getDate(), 1);
  assert.equal(plan.budget, 0);
  assert.equal(plan.costMeals, 0);
  assert.deepEqual(plan.items, []);
  assert.deepEqual(plan.collaboratorIds, ['2', '3']);
  for (const invalid of [{ destination: '' }, { startDate: '' }, { endDate: '2026-11-30' }, { startDate: '2026-02-31' }, { endDate: '2028-01-01' }, { travelerCount: 2.5 }]) assert.throws(() => tripSetupPayload({ ...info, ...invalid }));
});

test('Place search uses the catalog first and returns selectable map results without inventing coordinates', async () => {
  const previous = { fetch: globalThis.fetch, api: globalThis.__placeSearchApi };
  let remoteCalls = 0;
  globalThis.__placeSearchApi = { get: async () => ({ data: [{ id: '1', name: 'Cầu Rồng' }] }) };
  globalThis.fetch = async url => { remoteCalls++; assert.ok(String(url).includes('countrycodes=vn')); return { ok: true, json: async () => [{ place_id: 9, name: 'Mỹ Khê', display_name: 'Mỹ Khê, Đà Nẵng', lat: '16.05', lon: '108.24' }, { place_id: 10, display_name: 'Invalid', lat: 'bad', lon: '108' }] }; };
  try {
    let source = await readFile(new URL('../../frontend/src/services/tripPlaceSearch.js', import.meta.url), 'utf8');
    source = source.replace("import apiClient from './apiClient';", 'const apiClient = globalThis.__placeSearchApi;');
    const { searchTripPlaces } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    assert.deepEqual(await searchTripPlaces('   '), []);
    assert.equal((await searchTripPlaces('Cầu Rồng'))[0].id, '1');
    assert.equal(remoteCalls, 0);
    globalThis.__placeSearchApi.get = async () => ({ data: [] });
    const places = await searchTripPlaces('Mỹ Khê', 'Đà Nẵng');
    assert.equal(places.length, 1);
    assert.equal(places[0].latitude, 16.05);
    assert.equal(places[0].longitude, 108.24);
    assert.equal(places[0].id, 'osm_9');
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(() => searchTripPlaces('Not found'), /Hãy thử lại/);
  } finally { globalThis.fetch = previous.fetch; globalThis.__placeSearchApi = previous.api; }
});
