import api from './api';

export interface Industry {
  id: string;
  name: string;
  description: string;
  marketSize: string;
  growthRate: string;
}

export interface ProductVertical {
  id: string;
  name: string;
  description: string;
  marketSize: string;
  growthRate: string;
  customerTypes: CustomerType[];
}

export interface CustomerType {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  buyingBehavior: string;
  marketSegment: string;
  estimatedValue: string;
}

export interface DiscoverySession {
  id: string;
  userId: string;
  industry: string;
  productVertical?: string;
  selectedCustomerTypes: string[];
  conversationHistory: ConversationMessage[];
  status: 'exploring' | 'product_selection' | 'customer_selection' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface WebSearchResult {
  url: string;
  title: string;
  description: string;
  relevanceScore: number;
  location?: string;
  companyType?: string;
  // Enhanced fields for historical analysis
  currentContent?: string;
  historicalContent?: string;
  contentChanges?: {
    addedPhrases: string[];
    removedPhrases: string[];
    messagingEvolution: string;
  };
  keyPhrases?: string[];
  lastScraped?: Date;
}

export interface SearchConstraints {
  geography?: string[];
  maxResults?: number;
  companySize?: string[];
}

class AIDiscoveryService {
  /**
   * Get available industries
   */
  async getIndustries(): Promise<Industry[]> {
    console.log('Fetching industries...');
    const response = await api.get('/ai-discovery/industries');
    console.log('Industries response:', response.data);
    return response.data.industries;
  }

  /**
   * Start a new discovery session
   */
  async startDiscoverySession(industry: string): Promise<DiscoverySession> {
    const response = await api.post('/ai-discovery/sessions', { industry });
    return response.data.session;
  }

  /**
   * Get product verticals for an industry
   */
  async getProductVerticals(industry: string): Promise<ProductVertical[]> {
    console.log('Fetching product verticals for industry:', industry);
    const response = await api.get(`/ai-discovery/industries/${industry}/verticals`);
    console.log('Product verticals response:', response.data);
    return response.data.verticals;
  }

  /**
   * Add message to discovery session
   */
  async addMessage(sessionId: string, message: string, industry?: string, productVertical?: string): Promise<DiscoverySession> {
    const response = await api.post(`/ai-discovery/sessions/${sessionId}/messages`, { 
      message, 
      industry, 
      productVertical 
    });
    return response.data.session;
  }

  /**
   * Generate customer insights for product vertical
   */
  async generateCustomerInsights(industry: string, productVertical: string): Promise<{
    content: string;
    metadata?: any;
  }> {
    const response = await api.post('/ai-discovery/customer-insights', {
      industry,
      productVertical
    });
    return response.data.insights;
  }

  /**
   * Search for customers based on criteria
   */
  async searchForCustomers(
    industry: string,
    productVertical: string,
    customerTypes: string[],
    constraints?: SearchConstraints
  ): Promise<{ results: WebSearchResult[]; totalFound: number }> {
    console.log('Frontend searchForCustomers called with:', {
      industry,
      productVertical,
      customerTypes,
      constraints
    });
    
    const response = await api.post('/ai-discovery/search-customers', {
      industry,
      productVertical,
      customerTypes,
      constraints
    });
    
    console.log('Frontend searchForCustomers response:', response.data);
    return response.data;
  }

  /**
   * Enhanced customer search with web scraping and historical analysis
   */
  async searchCustomersEnhanced(
    industry: string,
    productVertical: string,
    customerTypes?: string[],
    constraints?: {
      geography?: string[];
      maxResults?: number;
      companySize?: string[];
    }
  ): Promise<{
    results: WebSearchResult[];
    metadata: {
      industry: string;
      productVertical: string;
      customerTypes: string[];
      constraints?: any;
      enhancedSearch: boolean;
      webScrapingEnabled: boolean;
      historicalAnalysisEnabled: boolean;
    };
  }> {
    console.log('Enhanced customer search:', { industry, productVertical, customerTypes, constraints });
    
    const response = await api.post('/ai-discovery/search-customers', {
      industry,
      productVertical,
      customerTypes: customerTypes || [],
      constraints
    });
    
    return response.data;
  }

  /**
   * Analyze a specific URL for historical content and messaging evolution
   */
  async analyzeUrl(
    url: string,
    industry: string,
    productVertical: string
  ): Promise<{
    url: string;
    industry: string;
    productVertical: string;
    currentContent?: string;
    historicalContent?: string;
    keyPhrases?: string[];
    contentChanges?: {
      addedPhrases: string[];
      removedPhrases: string[];
      messagingEvolution: string;
    };
    relevanceScore: number;
    lastScraped: Date;
  }> {
    console.log('Analyzing URL:', { url, industry, productVertical });
    
    const response = await api.post('/ai-discovery/analyze-url', {
      url,
      industry,
      productVertical
    });
    
    return response.data.data;
  }

  /**
   * Start a pipeline session for processing discovered URLs
   */
  async startPipelineSession(
    industry: string,
    productVertical: string,
    url: string
  ): Promise<{
    id: string;
    status: string;
    urls: string[];
    industry: string;
    productVertical: string;
  }> {
    console.log('Starting pipeline session:', { industry, productVertical, url });
    
    const response = await api.post('/pipeline/start', {
      urls: [url],
      industry,
      productVertical,
      source: 'ai-discovery'
    });
    
    return response.data;
  }
}

export const aiDiscoveryService = new AIDiscoveryService(); 