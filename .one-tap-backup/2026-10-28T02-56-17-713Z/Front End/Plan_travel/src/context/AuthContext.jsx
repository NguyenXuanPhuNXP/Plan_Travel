import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('travel_user');
    const storedToken = localStorage.getItem('travel_token');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken || 'local_session');
      } catch (e) {
        console.error('Lỗi phân tích dữ liệu user:', e);
      }
    }
    setLoading(false);
  }, []);

  const saveSession = (userData, userToken = 'mock_jwt_token') => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('travel_user', JSON.stringify(userData));
    localStorage.setItem('travel_token', userToken);
  };

  const login = async (email, password) => {
    try {
      // Thử gọi backend nếu có
      const response = await axios.post(`${API_BASE}/auth/login`, { email, password }, { timeout: 3000 });
      if (response.data && response.data.user) {
        saveSession(response.data.user, response.data.token);
        return response.data.user;
      }
    } catch (err) {
      console.warn('Backend không phản hồi hoặc lỗi, kích hoạt chế độ đăng nhập dự phòng:', err.message);
    }

    // Chế độ dự phòng (Offline / Client fallback)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password.length >= 6) {
          const namePart = email.split('@')[0].replace(/[._]/g, ' ');
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          const userData = {
            id: 'user_' + Date.now(),
            name: formattedName || 'Lữ khách',
            email: email,
            avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
            role: 'Pro Explorer',
            authProvider: 'local'
          };
          saveSession(userData, 'token_' + Date.now());
          resolve(userData);
        } else {
          reject(new Error('Email hoặc mật khẩu không hợp lệ (mật khẩu cần ít nhất 6 ký tự)'));
        }
      }, 600);
    });
  };

  const loginWithGoogle = async (googleData) => {
    try {
      // Thử xác thực với backend API
      const response = await axios.post(`${API_BASE}/auth/google`, googleData, { timeout: 3000 });
      if (response.data && response.data.user) {
        saveSession(response.data.user, response.data.token);
        return response.data.user;
      }
    } catch (err) {
      console.warn('Backend không kết nối được cho Google auth, sử dụng session client:', err.message);
    }

    // Google Auth thành công
    const userData = {
      id: googleData.sub || 'google_' + Date.now(),
      name: googleData.name || 'Lữ khách Google',
      email: googleData.email,
      avatar: googleData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${googleData.name}`,
      role: 'Google Explorer',
      authProvider: 'google'
    };

    saveSession(userData, googleData.idToken || 'google_token_' + Date.now());
    return userData;
  };

  const register = async (data) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, data, { timeout: 3000 });
      if (response.data && response.data.user) {
        saveSession(response.data.user, response.data.token);
        return response.data.user;
      }
    } catch (err) {
      console.warn('Backend đăng ký lỗi hoặc offline, dùng client fallback:', err.message);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (data.email && data.password === data.confirmPassword && data.password.length >= 6) {
          const userData = {
            id: 'user_' + Date.now(),
            name: data.name,
            email: data.email,
            avatar: `https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200`,
            role: 'Member Explorer',
            authProvider: 'local'
          };
          saveSession(userData, 'token_' + Date.now());
          resolve(userData);
        } else {
          reject(new Error('Thông tin đăng ký không hợp lệ hoặc mật khẩu không khớp'));
        }
      }, 600);
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('travel_user');
    localStorage.removeItem('travel_token');
  };

  const updateProfile = (newData) => {
    const updatedUser = { ...user, ...newData };
    setUser(updatedUser);
    localStorage.setItem('travel_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
