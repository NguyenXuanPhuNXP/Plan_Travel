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
  }
};
