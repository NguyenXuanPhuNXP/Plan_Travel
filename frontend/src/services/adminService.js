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

  getPlans: async (params = {}) => {
    const response = await apiClient.get('/admin/plans', { params });
    return response.data;
  },

  getPlanById: async (id) => {
    const response = await apiClient.get(`/admin/plans/${id}`);
    return response.data;
  },

  updatePlan: async (id, data) => {
    const response = await apiClient.patch(`/admin/plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id) => {
    const response = await apiClient.delete(`/admin/plans/${id}`);
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
  },

  addHotLocation: async (id) => {
    const response = await apiClient.post(`/admin/hot-locations/${id}`);
    return response.data;
  },

  removeHotLocation: async (id) => {
    const response = await apiClient.delete(`/admin/hot-locations/${id}`);
    return response.data;
  },

  getLocations: async (params = {}) => {
    const response = await apiClient.get('/admin/locations', { params });
    return response.data;
  },

  getLocationById: async (id) => {
    const response = await apiClient.get(`/admin/locations/${id}`);
    return response.data;
  },

  createLocation: async (data) => {
    const response = await apiClient.post('/admin/locations', data);
    return response.data;
  },

  updateLocation: async (id, data) => {
    const response = await apiClient.patch(`/admin/locations/${id}`, data);
    return response.data;
  },

  deleteLocation: async (id) => {
    const response = await apiClient.delete(`/admin/locations/${id}`);
    return response.data;
  }
};
