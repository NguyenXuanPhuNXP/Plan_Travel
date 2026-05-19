import apiClient from './apiClient';

export const adminService = {
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await apiClient.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  getUserActivity: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}/activity`);
    return response.data;
  },

  getHotLocations: async () => {
    const response = await apiClient.get('/admin/hot-locations');
    return response.data;
  },

  uploadLocationImage: async (imageDataUrl) => {
    const response = await apiClient.post('/admin/uploads/location-image', { imageDataUrl });
    return response.data;
  },

  updateHotLocation: async (id, data) => {
    const response = await apiClient.patch(`/admin/hot-locations/${id}`, data);
    return response.data;
  }
};
