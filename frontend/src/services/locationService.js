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
  getAutoPlan: async ({ region, days, budget, preferences, selectedLocationIds }) => {
    const response = await apiClient.post('/suggestions/auto-plan', {
      region,
      days,
      budget,
      preferences,
      selectedLocationIds
    });
    return response.data;
  },

  /**
   * Tìm kiếm locations từ DB
   */
  searchLocations: async (query, category) => {
    const params = new URLSearchParams();
    if (query) params.set('region', query);
    if (category) params.set('category', category);
    const response = await apiClient.get(`/locations?${params.toString()}`);
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
  }
};
