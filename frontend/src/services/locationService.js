import axios from 'axios';
import apiClient from './apiClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const normalizeText = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'd')
  .toLowerCase()
  .trim();

const getDestinationName = (loc = {}) => (
  loc.region || loc.city || loc.province || loc.destination || loc.name || ''
);

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value).split(',').map((tag) => tag.trim()).filter(Boolean);
  }
};

export const mergeDestinationLocations = (locations = []) => {
  const grouped = new Map();

  locations.forEach((loc) => {
    const destinationName = getDestinationName(loc).trim();
    if (!destinationName) return;

    const key = normalizeText(destinationName);
    const existing = grouped.get(key);
    const image = loc.imageUrl || loc.image_url || loc.image || '';
    const tags = parseTags(loc.tags);
    const gallerySlides = [
      ...(Array.isArray(loc.gallerySlides) ? loc.gallerySlides : []),
      ...(image ? [{ name: loc.name || destinationName, image }] : [])
    ];

    if (!existing) {
      grouped.set(key, {
        ...loc,
        id: `destination-${key.replace(/\s+/g, '-')}`,
        primaryLocationId: String(loc.id),
        name: destinationName,
        region: loc.region || destinationName,
        city: loc.city,
        province: loc.province,
        address: loc.address,
        description: loc.description,
        imageUrl: image || loc.imageUrl,
        image_url: image || loc.image_url,
        estimatedCost: loc.estimatedCost ?? loc.estimated_cost,
        suggestedDuration: loc.suggestedDuration || loc.suggested_duration,
        tags,
        gallerySlides,
        locations: [loc],
        locationCount: 1,
        planCount: Number(loc.planCount ?? loc.plan_count ?? loc.trips ?? 0) || 0
      });
      return;
    }

    existing.locations.push(loc);
    existing.locationCount += 1;
    existing.planCount += Number(loc.planCount ?? loc.plan_count ?? loc.trips ?? 0) || 0;
    existing.tags = [...new Set([...existing.tags, ...tags])];
    existing.gallerySlides = [...existing.gallerySlides, ...gallerySlides]
      .filter((slide, index, arr) => slide.image && arr.findIndex((item) => item.image === slide.image) === index);
    if (!existing.imageUrl && image) {
      existing.imageUrl = image;
      existing.image_url = image;
    }
    if (!existing.description && loc.description) existing.description = loc.description;
    if (!existing.estimatedCost && (loc.estimatedCost || loc.estimated_cost)) {
      existing.estimatedCost = loc.estimatedCost ?? loc.estimated_cost;
    }
    if (!existing.suggestedDuration && (loc.suggestedDuration || loc.suggested_duration)) {
      existing.suggestedDuration = loc.suggestedDuration || loc.suggested_duration;
    }
  });

  return Array.from(grouped.values());
};

export const locationService = {
  /**
   * Lấy tất cả địa điểm từ backend
   */
  getAll: async () => {
    try {
      const response = await apiClient.get('/locations');
      return response.data || [];
    } catch (err) {
      console.warn('Lỗi lấy danh sách địa điểm từ API, thử trực tiếp axios:', err.message);
      try {
        const fallbackRes = await axios.get(`${API_BASE}/locations`, { timeout: 3000 });
        return fallbackRes.data || [];
      } catch (_e) {
        return [];
      }
    }
  },

  /**
   * Lấy gợi ý địa điểm từ AI
   */
  getSuggestions: async (region, days, budget, preferences) => {
    try {
      const response = await apiClient.post('/suggestions/destinations', {
        region,
        days: days || null,
        budget: budget || null,
        preferences: preferences || []
      });
      return response.data;
    } catch (err) {
      console.warn('getSuggestions failed, trying fallback locations search:', err.message);
      const searchRes = await locationService.searchLocations(region, 20);
      return {
        region,
        total: searchRes.locations?.length || 0,
        suggestions: searchRes.locations || []
      };
    }
  },

  /**
   * Tự động tạo lịch trình
   */
  getAutoPlan: async ({ region, days, budget, preferences, selectedLocationIds, focusLocationId }) => {
    const response = await apiClient.post('/suggestions/auto-plan', {
      region,
      days,
      budget,
      preferences,
      selectedLocationIds,
      focusLocationId
    });
    return response.data;
  },

  /**
   * Tìm kiếm địa điểm theo từ khóa hoặc vùng
   */
  searchLocations: async (query, limit = 30) => {
    try {
      const response = await apiClient.get('/locations', {
        params: {
          region: query || undefined,
          limit
        }
      });
      const locations = response.data || [];
      return {
        locations: locations.map((loc) => ({
          ...loc,
          id: String(loc.id),
          latitude: loc.latitude ?? loc.lat,
          longitude: loc.longitude ?? loc.lng,
          imageUrl: loc.image_url || loc.imageUrl,
          estimatedCost: loc.estimated_cost ?? loc.estimatedCost,
          suggestedDuration: loc.suggested_duration || loc.suggestedDuration
        }))
      };
    } catch (err) {
      console.warn('searchLocations error:', err.message);
      return { locations: [] };
    }
  },

  /**
   * Tạo địa điểm thủ công
   */
  createManual: async (locationData) => {
    try {
      const payload = {
        name: locationData.name,
        address: locationData.address || '',
        description: locationData.description || '',
        imageUrl: locationData.imageUrl || locationData.image || '',
        latitude: locationData.latitude ?? locationData.lat,
        longitude: locationData.longitude ?? locationData.lng,
        category: locationData.category || 'manual',
        region: locationData.region || '',
        country: locationData.country || 'Vietnam',
        estimatedCost: locationData.estimatedCost || 0,
        suggestedDuration: locationData.suggestedDuration || null,
        category_id: locationData.category_id || null
      };

      const response = await apiClient.post('/locations', payload);
      return {
        ...locationData,
        ...response.data,
        id: response.data.id || `loc_${Date.now()}`
      };
    } catch (err) {
      console.warn('Backend không phản hồi khi tạo địa điểm, lưu tạm trên client:', err.message);
      return {
        ...locationData,
        id: `loc_manual_${Date.now()}`
      };
    }
  },

  /**
   * Tìm kiếm hybrid (Semantic + Keyword) từ Python AI Service
   */
  hybridSearch: async (query, limit = 10) => {
    try {
      const response = await axios.post('http://localhost:8001/ai/hybrid-search', {
        query,
        limit
      }, { timeout: 3000 });
      return response.data.results || [];
    } catch {
      return [];
    }
  },

  /**
   * Tìm kiếm điểm đến cho Explore page
   */
  searchDestinations: async (query, limit = 12) => {
    const keyword = String(query || '').trim();
    if (!keyword) return [];

    let locations = [];

    try {
      const response = await apiClient.get('/locations', {
        params: {
          region: keyword,
          limit: 80
        }
      });
      locations = response.data || [];
    } catch (err) {
      console.warn('Destination region search failed:', err.message);
    }

    if (locations.length === 0) {
      try {
        const response = await axios.post('http://localhost:8001/ai/hybrid-search', {
          query: keyword,
          limit: 40
        }, { timeout: 2000 });
        locations = response.data.results || [];
      } catch (_err) {
        // Python search unavailable, ignore
      }
    }

    if (locations.length === 0) {
      try {
        const response = await apiClient.get('/locations/hot', { params: { limit: 80 } });
        locations = response.data || [];
      } catch (err) {
        console.warn('Destination hot search fallback failed:', err.message);
      }
    }

    const normalizedKeyword = normalizeText(keyword);
    return mergeDestinationLocations(locations)
      .filter((dest) => {
        const haystack = normalizeText([
          dest.name,
          dest.region,
          dest.city,
          dest.province
        ].filter(Boolean).join(' '));
        return !normalizedKeyword || haystack.includes(normalizedKeyword);
      })
      .slice(0, limit);
  },

  /**
   * Lấy chi tiết một địa điểm theo ID
   */
  getLocationById: async (id) => {
    const response = await apiClient.get(`/locations/${id}`);
    return response.data;
  },

  /**
   * Lấy thống kê số lượng plans theo destination
   */
  getDestinationStats: async () => {
    try {
      const response = await apiClient.get('/locations/destination-stats');
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch destination stats:', err.message);
      return {};
    }
  },

  /**
   * Lấy danh sách điểm đến nổi bật
   */
  getHotLocations: async (limit = 10) => {
    try {
      const response = await apiClient.get('/locations/hot', { params: { limit } });
      return response.data || [];
    } catch (err) {
      console.warn('Failed to fetch hot locations:', err.message);
      return [];
    }
  },

  mergeDestinationLocations
};

export default locationService;
