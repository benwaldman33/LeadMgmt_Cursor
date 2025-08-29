import api from './api';

export interface Industry {
  id: string;
  name: string;
  description: string;
  marketSize: string;
  growthRate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVertical {
  id: string;
  name: string;
  description: string;
  marketSize: string;
  growthRate: string;
  isActive: boolean;
  industryId: string;
  customerTypes: CustomerType[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerType {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  buyingBehavior: string;
  marketSegment: string;
  estimatedValue: string;
  isActive: boolean;
  productVerticalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoverySession {
  id: string;
  userId: string;
  industry: string;
  productVertical?: string;
  status: 'exploring' | 'product_selection' | 'customer_selection' | 'completed';
  conversationHistory: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface WebSearchResult {
  url: string;
  title: string;
  description: string;
  relevanceScore: number;
  location?: string;
  companyType?: string;
}

export interface SearchConstraints {
  geography?: string[];
  maxResults?: number;
  companySize?: string[];
}

class AIDiscoveryService {
  /**
   * AI-Driven Industry Discovery: Use AI to discover industries based on user input
   */
  async discoverIndustries(
    userInput: string,
    constraints?: {
      maxIndustries?: number;
      focusAreas?: string[];
      excludeIndustries?: string[];
      marketSize?: string;
      growthRate?: string;
      industryType?: string;
      geography?: string;
    }
  ): Promise<{
    industries: Array<{
      id: string;
      name: string;
      description: string;
      marketSize: string;
      growthRate: string;
      relevanceScore: number;
      reasoning: string;
      suggestedVerticals: string[];
    }>;
    totalFound: number;
    aiEngineUsed: string;
    suggestions?: {
      adjacentIndustries?: string[];
      alternativeCriteria?: string[];
      marketInsights?: string;
    };
  }> {
    try {
      console.log('[AI Discovery] Discovering industries with AI for:', userInput, 'with criteria:', constraints);
      
      const response = await api.post('/ai-discovery/discover-industries', {
        userInput,
        constraints
      });

      if (response.data.success) {
        console.log('[AI Discovery] AI discovered industries:', response.data);
        return response.data;
      } else {
        throw new Error('AI industry discovery failed');
      }
    } catch (error) {
      console.error('[AI Discovery] Error discovering industries:', error);
      throw error;
    }
  }

  /**
   * Get available industries from database (legacy method - now uses AI discovery)
   */
  async getIndustries(): Promise<Industry[]> {
    console.log('Fetching industries from database...');
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
   * Get product verticals for an industry from database
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
}

export const aiDiscoveryService = new AIDiscoveryService(); 