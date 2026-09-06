import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { User, UserRole, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('zfit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('zfit_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const role = user?.role || null;
  const isAuthenticated = !!token && !!user;
  const isAdmin = role === 'ADMIN';

  const refreshUser = async () => {
    try {
      if (!token) return;
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('zfit_user', JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<UserRole> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    const data = res.data;
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('zfit_token', data.access_token);
    localStorage.setItem('zfit_user', JSON.stringify(data.user));
    return data.role;
  };

  const register = async (fullName: string, email: string, password: string): Promise<void> => {
    await api.post('/auth/register', {
      full_name: fullName,
      email,
      password,
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('zfit_token');
    localStorage.removeItem('zfit_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
