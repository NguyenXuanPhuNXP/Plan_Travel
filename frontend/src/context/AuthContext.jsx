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
    setLoading(false);
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
      throw new Error(err.response?.data?.message || 'Kh?ng th? x?c th?c. Vui l?ng ki?m tra k?t n?i v? th? l?i.');
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
