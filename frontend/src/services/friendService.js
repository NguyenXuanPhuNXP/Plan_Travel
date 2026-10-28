import api from "./apiClient";

const DEFAULT_USERS = [
  {
    id: "1",
    name: "Lê Hoàng Linh",
    fullName: "Lê Hoàng Linh",
    email: "linh.le.wanderlust@gmail.com",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    isFriend: false,
    requestStatus: null
  },
  {
    id: "2",
    name: "Nguyễn Văn An",
    fullName: "Nguyễn Văn An",
    email: "an.nguyen.traveler@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    isFriend: false,
    requestStatus: null
  },
  {
    id: "8",
    name: "Quản Trị Viên",
    fullName: "Quản Trị Viên",
    email: "admin@plantravel.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    isFriend: false,
    requestStatus: null
  },
  {
    id: "11",
    name: "Trần Minh Quân",
    fullName: "Trần Minh Quân",
    email: "quan.tran.explorer@gmail.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    isFriend: false,
    requestStatus: null
  },
  {
    id: "13",
    name: "Phạm Thu Hà",
    fullName: "Phạm Thu Hà",
    email: "ha.pham.travel@gmail.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    isFriend: false,
    requestStatus: null
  }
];

const getStoredLocal = (key, fallback = []) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setStoredLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
};

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('travel_user') || '{}');
    return String(user.id || '');
  } catch {
    return '';
  }
};

export const friendService = {
  getFriends: async () => {
    try {
      const response = await api.get("/friends");
      return response.data;
    } catch (err) {
      console.warn("Backend friendService.getFriends fallback to local storage:", err.message);
      return getStoredLocal("travel_friends", []);
    }
  },

  searchUsers: async (query = "") => {
    try {
      const q = encodeURIComponent(query || "");
      const response = await api.get(`/friends/search?q=${q}`);
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch (err) {
      console.warn("Backend friendService.searchUsers offline/fallback mode:", err.message);
    }

    // Client fallback: search or suggest users
    const currentId = getCurrentUserId();
    const friends = getStoredLocal("travel_friends", []);
    const friendRequests = getStoredLocal("travel_friend_requests", []);
    const localRegistered = getStoredLocal("travel_registered_users", []);
    const qLower = String(query || "").trim().toLowerCase();

    const candidatePool = [...DEFAULT_USERS];
    for (const reg of localRegistered) {
      if (!candidatePool.some(c => c.email === reg.email)) {
        candidatePool.push(reg);
      }
    }

    return candidatePool
      .filter(u => String(u.id) !== currentId)
      .filter(u => {
        if (!qLower) return true;
        return (
          (u.name && u.name.toLowerCase().includes(qLower)) ||
          (u.fullName && u.fullName.toLowerCase().includes(qLower)) ||
          (u.email && u.email.toLowerCase().includes(qLower))
        );
      })
      .map(u => {
        const isFriend = friends.some(f => String(f.id) === String(u.id));
        const hasSent = friendRequests.includes(String(u.id));
        return {
          ...u,
          isFriend,
          requestStatus: isFriend ? 'accepted' : hasSent ? 'sent' : null
        };
      });
  },

  sendFriendRequest: async (userId) => {
    try {
      const response = await api.post("/friends/request", { userId });
      return response.data;
    } catch (err) {
      console.warn("sendFriendRequest fallback to local storage:", err.message);
      const reqs = getStoredLocal("travel_friend_requests", []);
      if (!reqs.includes(String(userId))) {
        reqs.push(String(userId));
        setStoredLocal("travel_friend_requests", reqs);
      }
      return { message: "Đã gửi lời mời kết bạn (offline)." };
    }
  },

  acceptFriendRequest: async (friendId) => {
    try {
      const response = await api.post(`/friends/accept/${friendId}`);
      return response.data;
    } catch (err) {
      console.warn("acceptFriendRequest fallback to local storage:", err.message);
      const friends = getStoredLocal("travel_friends", []);
      const allCandidates = [...DEFAULT_USERS, ...getStoredLocal("travel_registered_users", [])];
      const matchedUser = allCandidates.find(u => String(u.id) === String(friendId)) || {
        id: String(friendId),
        name: "Bạn bè mới",
        fullName: "Bạn bè mới",
        email: "friend@plantravel.com",
        avatar: "/avatars/traveler.svg"
      };
      if (!friends.some(f => String(f.id) === String(friendId))) {
        friends.push({ ...matchedUser, isFriend: true });
        setStoredLocal("travel_friends", friends);
      }
      return friends;
    }
  },

  rejectFriendRequest: async (friendId) => {
    try {
      const response = await api.post(`/friends/reject/${friendId}`);
      return response.data;
    } catch (err) {
      console.warn("rejectFriendRequest fallback to local storage:", err.message);
      return { message: "Đã từ chối (offline)." };
    }
  },

  removeFriend: async (friendId) => {
    try {
      const response = await api.delete(`/friends/${friendId}`);
      return response.data;
    } catch (err) {
      console.warn("removeFriend fallback to local storage:", err.message);
      const friends = getStoredLocal("travel_friends", []).filter(f => String(f.id) !== String(friendId));
      setStoredLocal("travel_friends", friends);
      return friends;
    }
  },

  getNotifications: async () => {
    try {
      const response = await api.get("/friends/notifications");
      return response.data;
    } catch (err) {
      console.warn("getNotifications fallback to local storage:", err.message);
      return { notifications: [], friendRequests: [] };
    }
  },

  markNotificationsRead: async () => {
    try {
      const response = await api.post("/friends/notifications/read");
      return response.data;
    } catch (_err) {
      return { message: "OK" };
    }
  }
};
