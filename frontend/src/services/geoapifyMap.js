export const geoapifyKey = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim() || '';
export const geoapifyTileUrl = `https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(geoapifyKey)}`;
export const geoapifyAttribution = 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const destinations = new Map();
export async function resolveMapDestination(query, signal) {
  const text = query.trim();
  if (!text) return null;
  if (destinations.has(text)) return destinations.get(text);
  const data = await fetchGeoapify('geocode/search', { text, filter: 'countrycode:vn', format: 'json', lang: 'vi', limit: '1' }, signal);
  const place = data.results?.[0];
  if (!place || place.lat == null || place.lon == null || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon)) || Math.abs(Number(place.lat)) > 90 || Math.abs(Number(place.lon)) > 180) {
    throw new Error(`Không tìm được vị trí của “${text}”. Hãy chọn lại điểm đến.`);
  }
  const result = { name: text, lat: Number(place.lat), lng: Number(place.lon) };
  destinations.set(text, result);
  return result;
}

export async function fetchGeoapify(path, params, signal) {
  if (!geoapifyKey) throw new Error('Chưa cấu hình khóa bản đồ Geoapify.');
  const query = new URLSearchParams({ ...params, apiKey: geoapifyKey });
  const response = await fetch(`https://api.geoapify.com/${path === 'places' ? 'v2' : 'v1'}/${path}?${query}`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('Không thể tải dữ liệu Geoapify. Kiểm tra khóa API và hạn mức sử dụng.');
  return response.json();
}

export const MAP_PLACE_TYPES = [
  { id: 'sights', label: 'Tham quan', categories: 'tourism.attraction,tourism.sights,heritage,entertainment.museum' },
  { id: 'cafes', label: 'Cà phê', categories: 'catering.cafe,catering.ice_cream' },
  { id: 'food', label: 'Ăn uống', categories: 'catering.restaurant,catering.fast_food,catering.food_court,catering.bar,catering.pub' },
  { id: 'fun', label: 'Vui chơi', categories: 'entertainment,leisure.playground,sport' },
  { id: 'nature', label: 'Thiên nhiên & công viên', categories: 'natural,leisure.park,leisure.picnic,beach' },
  { id: 'shopping', label: 'Mua sắm & chợ', categories: 'commercial.shopping_mall,commercial.marketplace' },
  { id: 'stay', label: 'Lưu trú', categories: 'accommodation' }
];

export async function fetchGeoapifyPlaces(bounds, signal, type = 'explore') {
  const groups = type === 'explore' ? MAP_PLACE_TYPES.slice(0, 5) : MAP_PLACE_TYPES.filter(group => group.id === type);
  if (!groups.length) throw new Error('Loại địa điểm không hợp lệ.');
  const [west, south, east, north] = bounds.split(',').map(Number);
  // Separate quotas prevent dense hotel or restaurant listings from hiding other activities.
  const results = await Promise.all(groups.map(async group => {
    const data = await fetchGeoapify('places', {
      categories: group.categories, bias: `proximity:${(west + east) / 2},${(south + north) / 2}`,
      filter: `rect:${bounds}`, limit: '40', lang: 'vi'
    }, signal);
    return (data.features || []).flatMap(feature => {
      const place = feature.properties || {};
      if (!place.place_id || !place.name || place.country_code !== 'vn' ||
          place.lat == null || place.lon == null || !Number.isFinite(Number(place.lat)) ||
          !Number.isFinite(Number(place.lon)) || Math.abs(Number(place.lat)) > 90 || Math.abs(Number(place.lon)) > 180) return [];
      return [{
        id: `geoapify_${place.place_id}`, name: place.name, address: place.formatted || '', category: group.label,
        lat: Number(place.lat), lng: Number(place.lon), latitude: Number(place.lat), longitude: Number(place.lon),
        openingHours: place.datasource?.raw?.opening_hours || '',
        phone: place.datasource?.raw?.['contact:phone'] || place.datasource?.raw?.phone || ''
      }];
    }).slice(0, groups.length > 1 ? 10 : 40);
  }));
  return [...new Map(results.flat().map(place => [place.id, place])).values()];
}

export async function fetchGeoapifyRoute(coordinates, signal) {
  const waypoints = coordinates.split(';').map(point => point.split(',').reverse().join(',')).join('|');
  const data = await fetchGeoapify('routing', { waypoints, mode: 'drive' }, signal);
  const geometry = data.features?.[0]?.geometry;
  if (geometry?.type !== 'MultiLineString' || !geometry.coordinates?.length) {
    throw new Error('Không tìm được tuyến đường giữa các địa điểm đã chọn.');
  }
  return geometry.coordinates.map(line => line.map(([lng, lat]) => [lat, lng]));
}
