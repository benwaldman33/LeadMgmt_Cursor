import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { 
  Industry, 
  ProductVertical, 
  DiscoverySession,
  WebSearchResult
} from '../services/aiDiscoveryService';

interface AIDiscoveryState {
  selectedIndustry: string;
  selectedProductVertical: string;
  productVerticals: ProductVertical[];
  discoverySession: DiscoverySession | null;
  searchResults: WebSearchResult[];
  searchConstraints: {
    geography: string[];
    maxResults: number;
    companySize: string[];
  };
  userMessage: string;
}

interface AIDiscoveryContextType {
  state: AIDiscoveryState;
  setSelectedIndustry: (industry: string) => void;
  setSelectedProductVertical: (vertical: string) => void;
  setProductVerticals: (verticals: ProductVertical[]) => void;
  setDiscoverySession: (session: DiscoverySession | null) => void;
  setSearchResults: (results: WebSearchResult[]) => void;
  setSearchConstraints: (constraints: AIDiscoveryState['searchConstraints']) => void;
  setUserMessage: (message: string) => void;
  resetSession: () => void;
  hasActiveSession: boolean;
}

const AIDiscoveryContext = createContext<AIDiscoveryContextType | undefined>(undefined);

// Storage keys for persistence
const STORAGE_KEYS = {
  SELECTED_INDUSTRY: 'ai_discovery_selected_industry',
  SELECTED_PRODUCT_VERTICAL: 'ai_discovery_selected_product_vertical',
  PRODUCT_VERTICALS: 'ai_discovery_product_verticals',
  DISCOVERY_SESSION: 'ai_discovery_session',
  SEARCH_RESULTS: 'ai_discovery_search_results',
  SEARCH_CONSTRAINTS: 'ai_discovery_search_constraints',
  USER_MESSAGE: 'ai_discovery_user_message'
};

// Helper functions for state persistence
const saveToStorage = (key: string, data: any) => {
  try {
    if (data === null || data === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key: string, defaultValue: any = null) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

const clearDiscoveryState = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

const initialState: AIDiscoveryState = {
  selectedIndustry: loadFromStorage(STORAGE_KEYS.SELECTED_INDUSTRY, ''),
  selectedProductVertical: loadFromStorage(STORAGE_KEYS.SELECTED_PRODUCT_VERTICAL, ''),
  productVerticals: loadFromStorage(STORAGE_KEYS.PRODUCT_VERTICALS, []),
  discoverySession: loadFromStorage(STORAGE_KEYS.DISCOVERY_SESSION, null),
  searchResults: loadFromStorage(STORAGE_KEYS.SEARCH_RESULTS, []),
  searchConstraints: loadFromStorage(STORAGE_KEYS.SEARCH_CONSTRAINTS, {
    geography: [],
    maxResults: 50,
    companySize: []
  }),
  userMessage: loadFromStorage(STORAGE_KEYS.USER_MESSAGE, '')
};

interface AIDiscoveryProviderProps {
  children: ReactNode;
}

export const AIDiscoveryProvider: React.FC<AIDiscoveryProviderProps> = ({ children }) => {
  const [state, setState] = useState<AIDiscoveryState>(initialState);

  // Persist state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_INDUSTRY, state.selectedIndustry);
  }, [state.selectedIndustry]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_PRODUCT_VERTICAL, state.selectedProductVertical);
  }, [state.selectedProductVertical]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PRODUCT_VERTICALS, state.productVerticals);
  }, [state.productVerticals]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DISCOVERY_SESSION, state.discoverySession);
  }, [state.discoverySession]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SEARCH_RESULTS, state.searchResults);
  }, [state.searchResults]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SEARCH_CONSTRAINTS, state.searchConstraints);
  }, [state.searchConstraints]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USER_MESSAGE, state.userMessage);
  }, [state.userMessage]);

  const setSelectedIndustry = (industry: string) => {
    setState(prev => ({ ...prev, selectedIndustry: industry }));
  };

  const setSelectedProductVertical = (vertical: string) => {
    setState(prev => ({ ...prev, selectedProductVertical: vertical }));
  };

  const setProductVerticals = (verticals: ProductVertical[]) => {
    setState(prev => ({ ...prev, productVerticals: verticals }));
  };

  const setDiscoverySession = (session: DiscoverySession | null) => {
    setState(prev => ({ ...prev, discoverySession: session }));
  };

  const setSearchResults = (results: WebSearchResult[]) => {
    setState(prev => ({ ...prev, searchResults: results }));
  };

  const setSearchConstraints = (constraints: AIDiscoveryState['searchConstraints']) => {
    setState(prev => ({ ...prev, searchConstraints: constraints }));
  };

  const setUserMessage = (message: string) => {
    setState(prev => ({ ...prev, userMessage: message }));
  };

  const resetSession = () => {
    clearDiscoveryState();
    setState(initialState);
  };

  const hasActiveSession = !!(state.selectedIndustry || state.discoverySession || state.searchResults.length > 0);

  const contextValue: AIDiscoveryContextType = {
    state,
    setSelectedIndustry,
    setSelectedProductVertical,
    setProductVerticals,
    setDiscoverySession,
    setSearchResults,
    setSearchConstraints,
    setUserMessage,
    resetSession,
    hasActiveSession
  };

  return (
    <AIDiscoveryContext.Provider value={contextValue}>
      {children}
    </AIDiscoveryContext.Provider>
  );
};

export const useAIDiscovery = () => {
  const context = useContext(AIDiscoveryContext);
  if (context === undefined) {
    throw new Error('useAIDiscovery must be used within an AIDiscoveryProvider');
  }
  return context;
}; 