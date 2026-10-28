import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('travel_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops if the refresh token call fails
    if (!originalRequest || originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken
          });

          const { token, refreshToken: newRefreshToken } = response.data;

          if (token) {
            localStorage.setItem('access_token', token);
            localStorage.setItem('travel_token', token);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh token failed, clean up
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('travel_token');
          localStorage.removeItem('travel_user');
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
