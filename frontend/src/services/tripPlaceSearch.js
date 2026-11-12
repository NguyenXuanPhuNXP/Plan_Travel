import apiClient from './apiClient';
import { fetchGeoapify, resolveMapDestination } from './geoapifyMap';
import { normalizeDestination, suggestVietnamDestinations } from '../utils/vietnamDestinations';

export async function searchTripPlaces(query, context = '', signal) {
  const keyword = query.trim();
  if (!keyword) return [];
  let local = [];
  try { const { data } = await apiClient.get('/locations', { params: { region: keyword, limit: 6 }, signal }); local = Array.isArray(data) ? data : []; } catch (error) { if (signal?.aborted) throw error; }
  if (local.length) return local;
  return searchMapPlaces(keyword, context, signal);
}

export async function searchMapPlaces(query, context = '', signal) {
  const keyword = query.trim();
  if (keyword.length < 2) return [];
  const destinations = suggestVietnamDestinations(keyword).filter(name => normalizeDestination(name).startsWith(normalizeDestination(keyword))).slice(0, 5);
  if (destinations.length) return Promise.all(destinations.map(async name => {
    const point = await resolveMapDestination(name, signal);
    return { id: `destination_${normalizeDestination(name)}`, name, address: `${name}, Việt Nam`, latitude: point.lat, longitude: point.lng };
  }));
  const data = await fetchGeoapify('geocode/search', {
    format: 'json', text: [keyword, context].filter(Boolean).join(', '), filter: 'countrycode:vn', lang: 'vi', limit: '5'
  }, signal);
  const places = data.results || [];
  return places.filter(place => place.lat != null && place.lon != null && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)) && Math.abs(Number(place.lat)) <= 90 && Math.abs(Number(place.lon)) <= 180).map(place => ({
    id: `geoapify_${place.place_id}`, name: place.name || place.formatted?.split(',')[0] || keyword,
    address: place.formatted, latitude: Number(place.lat), longitude: Number(place.lon)
  }));
}
