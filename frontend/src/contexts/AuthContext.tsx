import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId?: string;
  team?: {
    id: string;
    name: string;
    industry: string;
  };
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const { data } = await authAPI.getProfile();
          setAuth(storedToken, data);
        } catch (error) {
          localStorage.removeItem('token');
          clearAuth();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [setAuth, clearAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { token: newToken, user: userData } = response;
      localStorage.setItem('token', newToken);
      setAuth(newToken, userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearAuth();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!token,
    setAuth: (user, token) => setAuth(token, user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 