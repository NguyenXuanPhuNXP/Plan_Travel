import apiClient from './apiClient';

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (data) => {
    const response = await apiClient.post('/auth/register', {
      fullName: data.name,
      email: data.email,
      phone: data.phone || null,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
    return response.data;
  },
  logout: async (refreshToken) => {
    const response = await apiClient.post('/auth/logout', { refreshToken });
    return response.data;
  },
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await apiClient.patch('/auth/profile', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await apiClient.patch('/auth/change-password', data);
    return response.data;
  }
};
