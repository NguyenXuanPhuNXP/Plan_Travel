import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('travel_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Mock login logic
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simple mock validation
        if (email && password.length >= 6) {
          const userData = {
            id: 'user_1',
            name: 'Traveler',
            email: email,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky'
          };
          setUser(userData);
          localStorage.setItem('travel_user', JSON.stringify(userData));
          resolve(userData);
        } else {
          reject(new Error('Email hoặc mật khẩu không đúng (mật khẩu ít nhất 6 ký tự)'));
        }
      }, 1000);
    });
  };

  const register = (data) => {
    // Mock register logic
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (data.email && data.password === data.confirmPassword) {
          const userData = {
            id: Date.now().toString(),
            name: data.name,
            email: data.email,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`
          };
          setUser(userData);
          localStorage.setItem('travel_user', JSON.stringify(userData));
          resolve(userData);
        } else {
          reject(new Error('Thông tin đăng ký không hợp lệ'));
        }
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('travel_user');
  };

  const updateProfile = (newData) => {
    const updatedUser = { ...user, ...newData };
    setUser(updatedUser);
    localStorage.setItem('travel_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
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
