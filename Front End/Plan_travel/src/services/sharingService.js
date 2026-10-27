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
   * Xem plan qua share token (không cần auth, nhưng nếu có auth sẽ nhận permission)
   */
  getShared: async (token) => {
    const response = await apiClient.get(`/sharing/shared/${token}`);
    return response.data;
  },

  /**
   * Cập nhật itinerary qua share token (cần đăng nhập + permission edit)
   */
  updateShared: async (token, data) => {
    const response = await apiClient.put(`/sharing/shared/${token}`, data);
    return response.data;
  },

  /**
   * Thêm item vào shared itinerary
   */
  addSharedItem: async (token, data) => {
    const response = await apiClient.post(`/sharing/shared/${token}/items`, data);
    return response.data;
  },

  createInviteLink: async (itineraryId) => {
    const response = await apiClient.post(`/sharing/${itineraryId}/invite-link`);
    return response.data;
  },

  getInviteInfo: async (token) => {
    const response = await apiClient.get(`/sharing/invite/${token}`);
    return response.data;
  },

  joinInvite: async (token) => {
    const response = await apiClient.post(`/sharing/invite/${token}/join`);
    return response.data;
  },

  /**
   * Xóa item từ shared itinerary
   */
  removeSharedItem: async (token, itemId) => {
    const response = await apiClient.delete(`/sharing/shared/${token}/items/${itemId}`);
    return response.data;
  },

  /**
   * Mời collaborator (hỗ trợ email hoặc userId)
   */
  addCollaborator: async (itineraryId, { email, userId, permission }) => {
    const response = await apiClient.post(`/sharing/${itineraryId}/collaborators`, { email, userId, permission });
    return response.data;
  },

  /**
   * Lấy danh sách thành viên nhóm
   */
  getGroupMembers: async (itineraryId) => {
    const response = await apiClient.get(`/sharing/${itineraryId}/collaborators`);
    return response.data;
  },

  updateCollaboratorPermission: async (itineraryId, userId, permission) => {
    const response = await apiClient.patch(`/sharing/${itineraryId}/collaborators/${userId}`, { permission });
    return response.data;
  },

  removeCollaborator: async (itineraryId, userId) => {
    const response = await apiClient.delete(`/sharing/${itineraryId}/collaborators/${userId}`);
    return response.data;
  },

  // Aliases for compatibility
  getTripGroup: async (itineraryId) => {
    return sharingService.getGroupMembers(itineraryId);
  },

  createGroupInvite: async (itineraryId, permission = 'view') => {
    return sharingService.createInviteLink(itineraryId);
  },

  inviteFriendToGroup: async (itineraryId, friendId, permission = 'edit') => {
    const response = await apiClient.post(`/sharing/${itineraryId}/collaborators`, {
      userId: friendId,
      permission
    });
    return response.data;
  },

  updateMemberPermission: async (itineraryId, userId, permission) => {
    return sharingService.updateCollaboratorPermission(itineraryId, userId, permission);
  },

  removeMember: async (itineraryId, userId) => {
    return sharingService.removeCollaborator(itineraryId, userId);
  },

  /**
   * Plans được chia sẻ với user
   */
  getSharedWithMe: async () => {
    const response = await apiClient.get('/sharing/shared-with-me');
    return response.data;
  }
};
