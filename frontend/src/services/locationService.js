import axios from 'axios';
import apiClient from './apiClient';

export const locationService = {
  /**
   * Lấy gợi ý địa điểm từ AI
   */
  getSuggestions: async (region, days, budget, preferences) => {
    const response = await apiClient.post('/suggestions/destinations', {
      region,
      days: days || null,
      budget: budget || null,
      preferences: preferences || []
    });
    return response.data;
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

  searchLocations: async (query, limit = 30) => {
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
  },

  createManual: async (location) => {
    const response = await apiClient.post('/locations', {
      name: location.name,
      address: location.address || '',
      latitude: location.latitude ?? location.lat,
      longitude: location.longitude ?? location.lng,
      category: location.category || 'manual',
      region: location.region || '',
      country: location.country || 'Vietnam',
      imageUrl: location.imageUrl || location.image,
      estimatedCost: location.estimatedCost || 0,
      suggestedDuration: location.suggestedDuration || null
    });
    return response.data;
  },

  /**
   * Tìm kiếm hybrid (Semantic + Keyword) từ Python AI Service
   */
  hybridSearch: async (query, limit = 10) => {
    // Gọi trực tiếp đến Python Service port 8001
    const response = await axios.post('http://localhost:8001/ai/hybrid-search', {
      query,
      limit
    });
    return response.data.results;
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

  getHotLocations: async (limit = 10) => {
    try {
      const response = await apiClient.get('/locations/hot', { params: { limit } });
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch hot locations:', err.message);
      return [];
    }
  }
};
