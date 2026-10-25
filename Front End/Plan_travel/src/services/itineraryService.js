import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const itineraryService = {
  getAll: async () => {
    try {
      const response = await axios.get(`${API_BASE}/itineraries`, { timeout: 3000 });
      return response.data;
    } catch (err) {
      console.warn('itineraryService: Dùng local fallback:', err.message);
      return [];
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${API_BASE}/itineraries`, data, { timeout: 3000 });
      return response.data;
    } catch (err) {
      console.warn('itineraryService: Dùng local fallback:', err.message);
      return { id: `itinerary_${Date.now()}`, ...data };
    }
  }
};
