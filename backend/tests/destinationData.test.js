import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Trip suggestions never substitute another region and cached Geoapify places have persistent IDs', async () => {
  const state = { rows: [], available: false, queries: [] };
  globalThis.__destinationData = state;
  const feature = { properties: { place_id: 'real-place', name: 'Cầu Rồng', country: 'Vietnam', country_code: 'vn', lat: 16.061, lon: 108.227, categories: ['tourism.attraction'] } };
  state.feature = feature;
  state.prisma = {
    $queryRawUnsafe: async (sql, ...params) => { state.queries.push({ sql, params }); assert.ok(params.length, 'A region filter must always be present'); return state.rows; },
    $executeRaw: async () => { state.rows = [{ id: 42n, external_id: 'real-place', name: 'Cầu Rồng', region: 'Đà Nẵng', country: 'Vietnam', latitude: 16.061, longitude: 108.227 }]; }
  };
  let source = await readFile(new URL('../src/services/aiSuggestionService.js', import.meta.url), 'utf8');
  source = source.replace("import axios from 'axios';", "const axios = { post: async () => { throw new Error('AI unavailable in test'); } };")
    .replace('import prisma from "../config/db.js";', 'const prisma = globalThis.__destinationData.prisma;')
    .replace('import { geocodeRegionInVietnam, fetchPlacesByBbox } from "./geoapify.js";', `const geocodeRegionInVietnam = async () => ({bbox:{lon1:108,lat1:16,lon2:109,lat2:17}}); const fetchPlacesByBbox = async () => { if (!globalThis.__destinationData.available) throw new Error('Provider unavailable in test'); return [globalThis.__destinationData.feature]; };`)
    .replace('"./locationMapper.js"', JSON.stringify(new URL('../src/services/locationMapper.js', import.meta.url).href));
  try {
    const { getSuggestions, ensureDestinationLocations } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    await assert.rejects(getSuggestions({ region: 'Đà Nẵng' }), error => error.status === 503);
    assert.equal(state.queries.length, 1, 'No unfiltered fallback to unrelated places');
    state.available = true;
    const places = await getSuggestions({ region: 'Đà Nẵng' });
    assert.equal(places.length, 1);
    assert.equal(places[0].id, '42');
    assert.equal(places[0].name, 'Cầu Rồng');
    assert.equal(places[0].latitude, 16.061);
    state.rows = Array.from({ length: 10 }, (_, index) => ({ id: BigInt(index + 100), name: `Điểm tham quan Huế ${index + 1}`, region: 'Huế', latitude: 16.46, longitude: 107.59 }));
    state.available = false;
    const queryCount = state.queries.length;
    const cached = await ensureDestinationLocations('Huế');
    assert.equal(cached.length, 10);
    assert.equal(state.queries.length, queryCount + 1, 'A populated destination does not fetch Geoapify again');
    assert.ok(state.queries.at(-1).params.every(value => value === '%Huế%'));
  } finally { delete globalThis.__destinationData; }
});

test('Region geocoding uses Vietnamese results and place searches prefer the destination center', async () => {
  const previousKey = process.env.GEOAPIFY_API_KEY;
  process.env.GEOAPIFY_API_KEY = 'test-key';
  const requests = [];
  globalThis.__geoProvider = { get: async (url, options) => {
    requests.push({ url, options });
    return { data: { results: [{ country_code: 'vn', lat: 16.46, lon: 107.58, bbox: { lon1: 107, lat1: 16, lon2: 108.5, lat2: 17.1 } }], features: [] } };
  } };
  try {
    const source = (await readFile(new URL('../src/services/geoapify.js', import.meta.url), 'utf8')).replace('import axios from "axios";', 'const axios = globalThis.__geoProvider;');
    const service = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const region = await service.geocodeRegionInVietnam('Huế');
    assert.equal(requests[0].options.params.lang, 'vi');
    assert.deepEqual(region.center, { lat: 16.46, lon: 107.58 });
    await service.fetchPlacesByBbox({ bbox: region.bbox, center: region.center, categories: ['tourism'] });
    assert.equal(requests[1].options.params.bias, 'proximity:107.58,16.46');
    assert.equal(requests[1].options.timeout, 10000);
  } finally {
    delete globalThis.__geoProvider;
    if (previousKey === undefined) delete process.env.GEOAPIFY_API_KEY; else process.env.GEOAPIFY_API_KEY = previousKey;
  }
});
