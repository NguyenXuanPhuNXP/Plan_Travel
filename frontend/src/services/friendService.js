import api from './apiClient';
const updated = response => { window.dispatchEvent(new Event('friends:updated')); return response.data; };
export const friendService = {
  getFriends: async () => (await api.get('/friends')).data,
  searchUsers: async (query = '') => (await api.get('/friends/search', { params: { q: query } })).data,
  sendFriendRequest: async userId => updated(await api.post('/friends/request', { userId })),
  acceptFriendRequest: async userId => updated(await api.post('/friends/accept/' + userId)),
  rejectFriendRequest: async userId => updated(await api.post('/friends/reject/' + userId)),
  removeFriend: async userId => updated(await api.delete('/friends/' + userId)),
  getNotifications: async () => (await api.get('/friends/notifications')).data,
  markNotificationsRead: async () => updated(await api.post('/friends/notifications/read'))
};
