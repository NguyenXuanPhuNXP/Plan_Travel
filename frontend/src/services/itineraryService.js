import apiClient from './apiClient';
export const itineraryService = {
  getAll: async () => (await apiClient.get('/itineraries')).data,
  getById: async id => (await apiClient.get('/itineraries/' + id)).data,
  create: async data => (await apiClient.post('/itineraries', data)).data,
  update: async (id, data) => (await apiClient.put('/itineraries/' + id, data)).data,
  delete: async id => (await apiClient.delete('/itineraries/' + id)).data,
  getPackingCatalog: async () => (await apiClient.get('/itineraries/packing-catalog')).data,
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
