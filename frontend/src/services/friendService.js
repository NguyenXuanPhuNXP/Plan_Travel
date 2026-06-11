import api from "./apiClient";

export const friendService = {
  getFriends: async () => {
    const response = await api.get("/friends");
    return response.data;
  },
  
  searchUsers: async (query) => {
    const response = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
  
  sendFriendRequest: async (userId) => {
    const response = await api.post("/friends/request", { userId });
    return response.data;
  },
  
  acceptFriendRequest: async (friendId) => {
    const response = await api.post(`/friends/accept/${friendId}`);
    return response.data;
  },
  
  rejectFriendRequest: async (friendId) => {
    const response = await api.post(`/friends/reject/${friendId}`);
    return response.data;
  },
  
  removeFriend: async (friendId) => {
    const response = await api.delete(`/friends/${friendId}`);
    return response.data;
  },
  
  getNotifications: async () => {
    const response = await api.get("/friends/notifications");
    return response.data;
  },
  
  markNotificationsRead: async () => {
    const response = await api.post("/friends/notifications/read");
    return response.data;
  }
};
