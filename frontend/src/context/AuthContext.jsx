import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const syncSession = () => {
      if (!active) return;
      const currentToken = localStorage.getItem('access_token');
      setToken(currentToken);
      if (!currentToken) setUser(null);
    };
    window.addEventListener('auth:updated', syncSession);
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('travel_user');
    const storedToken = localStorage.getItem('access_token') || localStorage.getItem('travel_token');
    if (storedUser && storedToken && storedToken.split('.').length === 3) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setToken(storedToken || 'local_session');
        // Synchronize tokens across both keys
        if (storedToken) {
          localStorage.setItem('access_token', storedToken);
          localStorage.setItem('travel_token', storedToken);
        }
      } catch (e) {
        console.error('Lỗi phân tích dữ liệu user:', e);
      }
    }
    if (storedToken) {
      apiClient.get('/auth/me').then(({ data }) => {
        if (!active) return;
        setUser(data);
        setToken(localStorage.getItem('access_token'));
        localStorage.setItem('travel_user', JSON.stringify(data));
      }).catch(error => {
        if (active && [401, 403, 404].includes(error.response?.status)) {
          ['access_token', 'travel_token', 'refresh_token', 'travel_user'].forEach(key => localStorage.removeItem(key));
          setUser(null);
          setToken(null);
        }
      }).finally(() => { if (active) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { active = false; window.removeEventListener('auth:updated', syncSession); };
  }, []);

  const saveSession = (userData, userToken, refreshToken = null) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('travel_user', JSON.stringify(userData));
    localStorage.setItem('travel_token', userToken);
    if (userToken) {
      localStorage.setItem('access_token', userToken);
    }
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  };

  const authenticate = async (endpoint, payload) => {
    try {
      const { data } = await axios.post(API_BASE + '/auth/' + endpoint, payload, { timeout: 10000 });
      if (!data.user || !data.token) throw new Error('Invalid authentication response');
      saveSession(data.user, data.token, data.refreshToken);
      return data.user;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Không thể xác thực. Vui lòng kiểm tra kết nối và thử lại.');
    }
  };
  const login = (email, password) => authenticate('login', { email, password });
  const loginWithGoogle = (googleData) => authenticate('google', googleData);
  const register = (data) => authenticate('register', { ...data, fullName: data.fullName || data.name });

  const logout = () => {
    window.google?.accounts?.id?.disableAutoSelect();
    setUser(null);
    setToken(null);
    localStorage.removeItem('travel_user');
    localStorage.removeItem('travel_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  const updateProfile = async (newData) => {
    const accountId = String(user?.id);
    const { data: updatedUser } = await apiClient.patch('/auth/profile', {
      fullName: newData.fullName || newData.name || user?.fullName,
      email: newData.email || user?.email,
      phone: newData.phone ?? user?.phone,
      avatarUrl: newData.avatarUrl ?? user?.avatarUrl
    });
    const activeUser = JSON.parse(localStorage.getItem('travel_user') || 'null');
    if (String(activeUser?.id) === accountId) {
      setUser(updatedUser);
      localStorage.setItem('travel_user', JSON.stringify(updatedUser));
    }
    return updatedUser;
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
