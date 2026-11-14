import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { suggestVietnamDestinations } from '../../frontend/src/utils/vietnamDestinations.js';

test('Vietnam destination suggestions work immediately with accents and partial names', () => {
  assert.equal(suggestVietnamDestinations('đà')[0], 'Đà Nẵng');
  assert.ok(suggestVietnamDestinations('da').includes('Đà Lạt'));
  assert.equal(suggestVietnamDestinations('vũng')[0], 'Vũng Tàu');
  assert.equal(suggestVietnamDestinations('vung')[0], 'Vũng Tàu');
  for (const [query, name] of [['nha', 'Nha Trang'], ['phu quoc', 'Phú Quốc'], ['hội', 'Hội An'], ['sa pa', 'Sa Pa'], ['măng', 'Măng Đen']]) {
    assert.ok(suggestVietnamDestinations(query).includes(name));
  }
  assert.deepEqual(suggestVietnamDestinations(''), []);
});

test('Explore queries activities separately so accommodation cannot crowd out cafes and sightseeing', async () => {
  const originalFetch = globalThis.fetch;
  const source = (await readFile(new URL('../../frontend/src/services/geoapifyMap.js', import.meta.url), 'utf8')).replace('import.meta.env', '{VITE_GEOAPIFY_API_KEY:"test-key"}');
  const { fetchGeoapifyPlaces } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const calls = [];
  globalThis.fetch = async url => {
    const params = new URL(url).searchParams;
    calls.push(params);
    const category = params.get('categories');
    return { ok: true, json: async () => ({ features: [{ properties: {
      place_id: category, name: category, country_code: 'vn', lat: 16, lon: 108
    } }, { properties: { place_id: 'shared', name: 'Shared place', country_code: 'vn', lat: 16.1, lon: 108.1 } }] }) };
  };
  try {
    const places = await fetchGeoapifyPlaces('107,15,109,17');
    assert.equal(calls.length, 5);
    assert.ok(calls.every(params => params.get('limit') === '40' && !params.get('categories').includes('accommodation')));
    assert.ok(calls.some(params => params.get('categories').includes('catering.cafe')));
    assert.ok(calls.some(params => params.get('categories').includes('catering.restaurant')));
    assert.ok(calls.some(params => params.get('categories').includes('tourism')));
    assert.equal(places.length, 6, 'Places belonging to multiple groups are shown once');
    calls.length = 0;
    const cafes = await fetchGeoapifyPlaces('107,15,109,17', undefined, 'cafes');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].get('limit'), '40');
    assert.ok(cafes.every(place => place.category === 'Cà phê'));
    await assert.rejects(fetchGeoapifyPlaces('107,15,109,17', undefined, 'invalid'), /không hợp lệ/);
  } finally { globalThis.fetch = originalFetch; }
});

test('Geoapify map uses Vietnam search, converts route legs and reports provider errors', async () => {
  const originalFetch = globalThis.fetch;
  const source = await readFile(new URL('../../frontend/src/services/geoapifyMap.js', import.meta.url), 'utf8');
  const moduleUrl = key => `data:text/javascript;base64,${Buffer.from(source.replace('import.meta.env', JSON.stringify({ VITE_GEOAPIFY_API_KEY: key }))).toString('base64')}`;
  const providerUrl = moduleUrl('test-key');
  const provider = await import(providerUrl);
  let request;
  let reply;
  let ok = true;
  globalThis.fetch = async (url, options) => {
    request = { url: new URL(url), options };
    return { ok, json: async () => reply };
  };
  try {
    assert.match(provider.geoapifyTileUrl, /maps\.geoapify\.com\/v1\/tile\/osm-carto/);
    reply = { features: [{ geometry: { type: 'MultiLineString', coordinates: [
      [[105.8, 21], [105.9, 21.1]], [[105.9, 21.1], [106, 21.2]]
    ] } }] };
    assert.deepEqual(await provider.fetchGeoapifyRoute('105.8,21;105.9,21.1;106,21.2'), [
      [[21, 105.8], [21.1, 105.9]], [[21.1, 105.9], [21.2, 106]]
    ]);
    assert.equal(request.url.searchParams.get('waypoints'), '21,105.8|21.1,105.9|21.2,106');
    assert.equal(request.url.searchParams.get('mode'), 'drive');
    assert.ok(request.options.signal instanceof AbortSignal);

    const searchSource = (await readFile(new URL('../../frontend/src/services/tripPlaceSearch.js', import.meta.url), 'utf8'))
      .replace("import apiClient from './apiClient';", 'const apiClient = { get: async () => ({ data: [] }) };')
      .replace("'./geoapifyMap'", JSON.stringify(providerUrl));
    const resolvedSearchSource = searchSource.replace("'../utils/vietnamDestinations'", JSON.stringify(new URL('../../frontend/src/utils/vietnamDestinations.js', import.meta.url).href));
    const { searchTripPlaces, searchMapPlaces } = await import(`data:text/javascript;base64,${Buffer.from(resolvedSearchSource).toString('base64')}`);
    reply = { results: [
      { place_id: 'valid', name: 'Hồ Hoàn Kiếm', formatted: 'Hồ Hoàn Kiếm, Hà Nội', lat: 21.028, lon: 105.852 },
      { place_id: 'invalid', lat: 100, lon: 200 }, { place_id: 'missing', lat: null, lon: null }
    ] };
    const places = await searchTripPlaces('Hồ Hoàn Kiếm', 'Hà Nội');
    assert.equal(request.url.searchParams.get('filter'), 'countrycode:vn');
    assert.equal(request.url.searchParams.get('text'), 'Hồ Hoàn Kiếm, Hà Nội');
    assert.equal(places.length, 1);
    assert.equal(places[0].id, 'geoapify_valid');
    assert.equal(places[0].latitude, 21.028);

    reply = { results: [{ name: 'Đà Nẵng', lat: 16.0685, lon: 108.224 }] };
    const destination = await provider.resolveMapDestination('Đà Nẵng');
    assert.deepEqual(destination, { name: 'Đà Nẵng', lat: 16.0685, lng: 108.224 });
    assert.equal(request.url.searchParams.get('text'), 'Đà Nẵng');
    reply = { results: [] };
    assert.deepEqual(await provider.resolveMapDestination('Đà Nẵng'), destination, 'Reusing a destination does not need another API call');
    const mapResults = await searchMapPlaces('Đà Nẵng');
    assert.equal(mapResults[0].name, 'Đà Nẵng');
    assert.equal(mapResults[0].latitude, 16.0685);
    await assert.rejects(provider.resolveMapDestination('Missing destination'), /Không tìm được vị trí/);

    reply = { features: [
      { properties: { place_id: 'museum', name: 'Bảo tàng', country_code: 'vn', formatted: 'Hà Nội', lat: 21, lon: 105, categories: ['tourism.museum'], datasource: { raw: { opening_hours: 'Mo-Fr 08:00-17:00', phone: '0123456789' } } } },
      { properties: { place_id: 'invalid', name: 'Invalid', country_code: 'vn', lat: 91, lon: 105 } },
      { properties: { place_id: 'foreign', name: 'Foreign', country_code: 'us', lat: 21, lon: 105 } },
      { properties: { place_id: 'unnamed', country_code: 'vn', lat: 21, lon: 105 } }
    ] };
    const nearby = await provider.fetchGeoapifyPlaces('105,20,106,22', undefined, 'sights');
    assert.equal(request.url.pathname, '/v2/places');
    assert.equal(request.url.searchParams.get('filter'), 'rect:105,20,106,22');
    assert.equal(request.url.searchParams.get('limit'), '40');
    assert.equal(nearby.length, 1);
    assert.equal(nearby[0].category, 'Tham quan');
    assert.equal(nearby[0].latitude, 21);
    assert.equal(nearby[0].phone, '0123456789');
    assert.equal(nearby[0].openingHours, 'Mo-Fr 08:00-17:00');

    reply = { features: [] };
    await assert.rejects(provider.fetchGeoapifyRoute('105,21;106,22'), /Không tìm được tuyến đường/);
    ok = false;
    await assert.rejects(provider.fetchGeoapify('geocode/search', {}), /hạn mức/);
    const missingKey = await import(moduleUrl(''));
    await assert.rejects(missingKey.fetchGeoapify('routing', {}), /Chưa cấu hình/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
