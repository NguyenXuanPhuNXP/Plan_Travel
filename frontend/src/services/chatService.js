import api from "./apiClient";

export const chatService = {
  getRecentChats: async () => {
    const response = await api.get("/chat");
    return response.data;
  },

  getMessages: async (friendId) => {
    const response = await api.get(`/chat/${friendId}`);
    return response.data;
  },

  sendMessage: async (friendId, content) => {
    const response = await api.post(`/chat/${friendId}`, { content });
    return response.data;
  },

  markAsRead: async (friendId) => {
    const response = await api.post(`/chat/${friendId}/read`);
    return response.data;
  },

  // Group chat for trip planning
  getTripGroups: async () => {
    const response = await api.get("/chat/groups");
    return response.data;
  },

  getTripGroupMessages: async (itineraryId) => {
    const response = await api.get(`/chat/group/${itineraryId}`);
    return response.data;
  },

  sendTripGroupMessage: async (itineraryId, content) => {
    const response = await api.post(`/chat/group/${itineraryId}`, { content });
    return response.data;
  }
};
