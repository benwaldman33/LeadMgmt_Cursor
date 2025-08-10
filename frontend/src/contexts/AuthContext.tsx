import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId?: string;
  status?: string; // Made optional since backend might not return it
  createdAt?: string; // Made optional since backend might not return it
  updatedAt?: string; // Made optional since backend might not return it
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
  redirectPending: boolean;
  renderKey: number;
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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bbds_access_token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  
  // Use refs to prevent stale closures in async operations
  const isAuthenticatedRef = useRef(false);
  const redirectPendingRef = useRef(false);
  
  // Force re-render counter to ensure all consumers update
  const [renderKey, setRenderKey] = useState(0);

  // Update refs when state changes
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    redirectPendingRef.current = redirectPending;
    
    // Persist auth state to localStorage whenever it changes
    if (isAuthenticated && user && token) {
      console.log('💾 [AUTH PROVIDER] Persisting auth state to localStorage');
      localStorage.setItem('bbds_access_token', token);
      localStorage.setItem('bbds_user', JSON.stringify(user));
      localStorage.setItem('bbds_isAuthenticated', 'true');
      localStorage.setItem('bbds_renderKey', renderKey.toString());
    }
  }, [isAuthenticated, redirectPending, user, token, renderKey]);

  // Add this RIGHT BEFORE the navigation useEffect
  console.log('🔧 [AUTH DEBUG] Navigation useEffect being registered with dependencies:', {
    isAuthenticated,
    hasUser: !!user,
    hasToken: !!token,
    loading,
    navigate: typeof navigate,
    redirectPending
  });

  // Navigation effect - only redirect to dashboard when redirectPending is true
  useEffect(() => {
    console.log('🧭 [AUTH PROVIDER] Navigation effect running with:', {
      isAuthenticated,
      hasUser: !!user,
      hasToken: !!token,
      loading,
      redirectPending
    });
    
    // Only redirect to dashboard when explicitly requested (redirectPending = true)
    if (redirectPending && isAuthenticated && !!user && !!token && !loading) {
      console.log('✅ [AUTH PROVIDER] Redirect pending - navigating to dashboard');
      
      try {
        console.log('🚀 [AUTH PROVIDER] Navigating to dashboard...');
        navigate('/dashboard');
        console.log('✅ [AUTH PROVIDER] Navigation completed successfully');
        
        // Clear redirect pending after successful navigation
        console.log('🧹 [AUTH PROVIDER] Clearing redirectPending flag');
        setRedirectPending(false);
      } catch (error) {
        console.error('❌ [AUTH PROVIDER] Navigation failed:', error);
      }
    } else {
      console.log('⏸️ [AUTH PROVIDER] No redirect needed:', {
        redirectPending,
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        loading
      });
    }
  }, [redirectPending, isAuthenticated, !!user, !!token, loading, navigate]);

  // Safety mechanism: if redirectPending is true for too long, clear it
  useEffect(() => {
    if (redirectPending) {
      const safetyTimer = setTimeout(() => {
        if (redirectPendingRef.current) {
          console.log('⚠️ [AUTH PROVIDER] Safety mechanism: redirectPending stuck for too long, clearing it');
          setRedirectPending(false);
        }
      }, 1000); // Reduced to 1 second since navigation should be faster now
      
      return () => clearTimeout(safetyTimer);
    }
  }, [redirectPending]);

  // Safety mechanism: prevent renderKey from resetting unexpectedly
  useEffect(() => {
    if (renderKey > 0 && !isAuthenticated && !loading) {
      console.log('⚠️ [AUTH PROVIDER] Safety mechanism: renderKey reset detected, restoring state');
      console.log('🔍 [AUTH PROVIDER] Current state:', { renderKey, isAuthenticated, loading, hasUser: !!user, hasToken: !!token });
      
      // This should not happen normally, but if it does, try to restore from localStorage
      const storedToken = localStorage.getItem('bbds_access_token');
      const storedUser = localStorage.getItem('bbds_user');
      
      if (storedToken && storedUser) {
        try {
          console.log('🔄 [AUTH PROVIDER] Restoring auth state from localStorage');
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
          setRenderKey(prev => Math.max(prev, 1)); // Ensure renderKey doesn't go below 1
          console.log('✅ [AUTH PROVIDER] Auth state restored successfully');
        } catch (e) {
          console.error('❌ [AUTH PROVIDER] Failed to restore auth state:', e);
        }
      } else {
        console.log('ℹ️ [AUTH PROVIDER] No stored credentials found, cannot restore state');
      }
    }
  }, [renderKey, isAuthenticated, loading, user, token]);

  // Debug effect to track all state changes
  useEffect(() => {
    console.log('🔄 [AUTH PROVIDER] State changed:', {
      isAuthenticated,
      loading,
      hasUser: !!user,
      hasToken: !!token,
      redirectPending,
      renderKey,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, loading, user, token, redirectPending, renderKey]);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      // Check if token is expired before making API call
      try {
        const { exp } = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() >= exp * 1000) {
          // Token expired - clear and exit
          localStorage.clear();
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
      } catch {
        // Invalid token format
        localStorage.clear();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      // Token is valid, try to verify with backend
      try {
        await authService.getProfile();
        setToken(token);
        setUser(JSON.parse(user));
        setIsAuthenticated(true);
        setLoading(false);
      } catch (error) {
        // Backend verification failed
        localStorage.clear();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      const { user: userData, accessToken: newToken } = response;
      
      // Use setAuth instead of duplicating logic
      setAuth(userData, newToken);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('bbds_access_token');
    localStorage.removeItem('bbds_user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setRedirectPending(false);
  };

  const setAuth = useCallback((userData: User, newToken: string) => {
    console.log('🔐 [AUTH CONTEXT] setAuth called with:', { 
      userData: { id: userData.id, email: userData.email, role: userData.role }, 
      tokenLength: newToken?.length 
    });
    
    // Set redirect pending first to indicate navigation is needed
    console.log('🎯 [AUTH CONTEXT] Setting redirectPending to true');
    setRedirectPending(true);
    
    // Update localStorage
    localStorage.setItem('bbds_access_token', newToken);
    localStorage.setItem('bbds_user', JSON.stringify(userData));
    
    // Update all state values
    console.log('🔄 [AUTH CONTEXT] Updating state values...');
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    
    // Force all consumers to re-render by incrementing render key
    setRenderKey(prev => prev + 1);
    
    console.log('💾 [AUTH CONTEXT] Stored in localStorage');
    console.log('✅ [AUTH CONTEXT] State updated - isAuthenticated set to true');
    console.log('👤 [AUTH CONTEXT] User state:', userData);
    console.log('🔑 [AUTH CONTEXT] Token state length:', newToken?.length);
    console.log('🎯 [AUTH CONTEXT] Navigation will be handled by useEffect navigation effect');
    console.log('⏳ [AUTH CONTEXT] redirectPending set to true, waiting for navigation effect...');
    
    // Don't clear redirectPending here - let the navigation effect handle it
  }, []);

  // Add this RIGHT AFTER the setAuth function
  useEffect(() => {
    console.log('🔄 [AUTH DEBUG] State change detected:', {
      isAuthenticated,
      hasUser: !!user,
      hasToken: !!token,
      loading,
      redirectPending,
      user: user ? 'present' : 'null',
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, !!user, !!token, loading, redirectPending, user]);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated,
    setAuth,
    redirectPending,
    renderKey, // Add renderKey to force re-renders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 