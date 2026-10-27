import apiClient from './apiClient';

export const itineraryService = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/itineraries');
      return response.data;
    } catch (err) {
      console.warn('itineraryService.getAll fallback:', err.message);
      const stored = localStorage.getItem('travel_trips');
      return stored ? JSON.parse(stored) : [];
    }
  },

  getById: async (id) => {
    try {
      const response = await apiClient.get(`/itineraries/${id}`);
      return response.data;
    } catch (err) {
      console.warn('itineraryService.getById fallback:', err.message);
      const stored = localStorage.getItem('travel_trips');
      if (stored) {
        const trips = JSON.parse(stored);
        return trips.find(t => String(t.id) === String(id)) || null;
      }
      return null;
    }
  },

  create: async (data) => {
    try {
      const response = await apiClient.post('/itineraries', data);
      return response.data;
    } catch (err) {
      console.warn('itineraryService.create fallback:', err.message);
      // Fallback local object
      const fallbackId = `itinerary_${Date.now()}`;
      return { id: fallbackId, ...data };
    }
  },

  update: async (id, data) => {
    try {
      const response = await apiClient.put(`/itineraries/${id}`, data);
      return response.data;
    } catch (err) {
      console.warn('itineraryService.update fallback:', err.message);
      return { id, ...data };
    }
  },

  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/itineraries/${id}`);
      return response.data;
    } catch (err) {
      console.warn('itineraryService.delete fallback:', err.message);
      return { success: true };
    }
  },

  getPackingCatalog: async () => {
    try {
      const response = await apiClient.get('/itineraries/packing-catalog');
      return response.data;
    } catch (err) {
      console.warn('itineraryService.getPackingCatalog fallback:', err.message);
      return [];
    }
  },

  addPackingItem: async (itineraryId, data) => {
    const response = await apiClient.post(`/itineraries/${itineraryId}/packing`, data);
    return response.data;
  },

  updatePackingItem: async (itineraryId, itemId, data) => {
    const response = await apiClient.put(`/itineraries/${itineraryId}/packing/${itemId}`, data);
    return response.data;
  },

  removePackingItem: async (itineraryId, itemId) => {
    const response = await apiClient.delete(`/itineraries/${itineraryId}/packing/${itemId}`);
    return response.data;
  }
};
