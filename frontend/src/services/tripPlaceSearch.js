import apiClient from './apiClient';

export async function searchTripPlaces(query, context = '') {
  const keyword = query.trim();
  if (!keyword) return [];
  let local = [];
  try { const { data } = await apiClient.get('/locations', { params: { region: keyword, limit: 6 } }); local = Array.isArray(data) ? data : []; } catch { /* Search the map provider when the local catalog is unavailable. */ }
  if (local.length) return local;
  const params = new URLSearchParams({ format: 'jsonv2', q: [keyword, context].filter(Boolean).join(', '), countrycodes: 'vn', limit: '5' });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Chưa tìm được địa điểm. Hãy thử lại hoặc nhập tên thủ công.');
  const places = await response.json();
  return places.filter(place => place.lat != null && place.lon != null && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)) && Math.abs(Number(place.lat)) <= 90 && Math.abs(Number(place.lon)) <= 180).map(place => ({
    id: `osm_${place.place_id}`, name: place.name || place.display_name.split(',')[0],
    address: place.display_name, latitude: Number(place.lat), longitude: Number(place.lon)
  }));
}
