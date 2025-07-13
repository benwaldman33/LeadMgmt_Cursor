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
  async addMessage(sessionId: string, message: string): Promise<DiscoverySession> {
    const response = await api.post(`/ai-discovery/sessions/${sessionId}/messages`, { message });
    return response.data.session;
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