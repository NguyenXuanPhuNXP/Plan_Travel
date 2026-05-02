import apiClient from './apiClient';

export const sharingService = {
  /**
   * Tạo share link
   */
  share: async (itineraryId, { visibility, permission }) => {
    const response = await apiClient.post(`/sharing/${itineraryId}/share`, { visibility, permission });
    return response.data;
  },

  /**
   * Xem plan qua share token (không cần auth)
   */
  getShared: async (token) => {
    const response = await apiClient.get(`/sharing/shared/${token}`);
    return response.data;
  },

  /**
   * Mời collaborator
   */
  addCollaborator: async (itineraryId, { email, permission }) => {
    const response = await apiClient.post(`/sharing/${itineraryId}/collaborators`, { email, permission });
    return response.data;
  },

  /**
   * Xóa collaborator
   */
  removeCollaborator: async (itineraryId, userId) => {
    const response = await apiClient.delete(`/sharing/${itineraryId}/collaborators/${userId}`);
    return response.data;
  },

  /**
   * Plans được chia sẻ với user
   */
  getSharedWithMe: async () => {
    const response = await apiClient.get('/sharing/shared-with-me');
    return response.data;
  }
};
