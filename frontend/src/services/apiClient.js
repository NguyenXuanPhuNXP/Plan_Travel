import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const apiClient = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });
let refreshPromise;
apiClient.interceptors.request.use(config => {
  config._accountId ??= localStorage.getItem('travel_user');
  const token = localStorage.getItem('access_token') || localStorage.getItem('travel_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
apiClient.interceptors.response.use(response => response, async error => {
  const request = error.config;
  if (!request || request._retry || error.response?.status !== 401 ||
      /\/auth\/(login|register|google|refresh|logout)/.test(request.url || '')) throw error;
  const currentToken = localStorage.getItem('access_token');
  const requestToken = request.headers?.Authorization;
  request._retry = true;
  // A late failure from an older session must never be retried as another user.
  if (request._accountId && request._accountId !== localStorage.getItem('travel_user')) throw error;
  if (currentToken && requestToken !== 'Bearer ' + currentToken) return apiClient(request);
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw error;
  if (!refreshPromise) {
    const account = localStorage.getItem('travel_user');
    refreshPromise = axios.post(API_BASE + '/auth/refresh', { refreshToken })
      .then(({ data }) => {
        if (localStorage.getItem('refresh_token') !== refreshToken) throw new Error('Session changed during refresh');
        localStorage.setItem('access_token', data.token);
        localStorage.setItem('travel_token', data.token);
        localStorage.setItem('refresh_token', data.refreshToken);
        window.dispatchEvent(new Event('auth:updated'));
        return data.token;
      }).catch(refreshError => {
        if ([400, 401, 403].includes(refreshError.response?.status) && localStorage.getItem('travel_user') === account && localStorage.getItem('refresh_token') === refreshToken) {
          ['access_token', 'travel_token', 'refresh_token', 'travel_user'].forEach(key => localStorage.removeItem(key));
          window.dispatchEvent(new Event('auth:updated'));
        }
        throw refreshError;
      }).finally(() => { refreshPromise = undefined; });
  }
  const token = await refreshPromise;
  request.headers.Authorization = 'Bearer ' + token;
  return apiClient(request);
});
export default apiClient;
