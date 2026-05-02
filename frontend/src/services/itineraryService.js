import apiClient from './apiClient';

export const itineraryService = {
  // CRUD Itineraries
  create: async (data) => {
    const response = await apiClient.post('/itineraries', data);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/itineraries');
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/itineraries/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/itineraries/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/itineraries/${id}`);
    return response.data;
  },

  // Items
  addItem: async (itineraryId, item) => {
    const response = await apiClient.post(`/itineraries/${itineraryId}/items`, item);
    return response.data;
  },

  updateItem: async (itineraryId, itemId, data) => {
    const response = await apiClient.put(`/itineraries/${itineraryId}/items/${itemId}`, data);
    return response.data;
  },

  removeItem: async (itineraryId, itemId) => {
    const response = await apiClient.delete(`/itineraries/${itineraryId}/items/${itemId}`);
    return response.data;
  },

  reorderItems: async (itineraryId, orderedItemIds) => {
    const response = await apiClient.put(`/itineraries/${itineraryId}/reorder`, { orderedItemIds });
    return response.data;
  }
};
