import apiClient from './apiClient';

export function communityImageUrl(source) {
  return source?.startsWith('/uploads/') ? new URL(source, new URL(apiClient.defaults.baseURL, window.location.origin)).href : source;
}

export const communityService = {
  list: (before, filters = {}) => apiClient.get('/community', { params: { ...filters, before } }).then(response => response.data),
  copy: id => apiClient.post(`/community/${id}/copy`).then(response => response.data),
  get: (id, beforeComment) => apiClient.get(`/community/${id}`, { params: { beforeComment } }).then(response => response.data),
  create: input => apiClient.post('/community', input).then(response => response.data),
  update: (id, input) => apiClient.put(`/community/${id}`, input).then(response => response.data),
  delete: id => apiClient.delete(`/community/${id}`),
  comment: (id, content, parentId) => apiClient.post(`/community/${id}/comments`, { content, parentId }).then(response => response.data),
  deleteComment: (id, commentId) => apiClient.delete(`/community/${id}/comments/${commentId}`),
  rate: (id, rating) => apiClient.put(`/community/${id}/rating`, { rating }).then(response => response.data),
  removeRating: id => apiClient.delete(`/community/${id}/rating`).then(response => response.data),
};
