import api from './api';

export interface MarketCriteria {
  minLocations: number;
  maxLocations?: number;
  geography: string;
  industries?: string[];
  excludeIndustries?: string[];
  filters?: {
    growthRate?: { min?: number; max?: number };
    avgRevenue?: { min?: number; max?: number };
    competitionLevel?: 'low' | 'medium' | 'high';
  };
}

export interface IndustryData {
  name: string;
  naicsCode?: string;
  locationCount: number;
  description: string;
  avgRevenue?: number;
  growthRate?: number;
  competitionLevel?: 'low' | 'medium' | 'high';
  keyCharacteristics?: string[];
  marketSize?: number;
}

export interface SubIndustryData {
  name: string;
  naicsCode?: string;
  locationCount: number;
  description: string;
  parentIndustry: string;
  avgRevenue?: number;
  marketShare?: number;
  keyPlayers?: string[];
  buyingPatterns?: string[];
}

export interface ProductData {
  name: string;
  category: string;
  description: string;
  targetMarket: string;
  avgPrice?: { min: number; max: number };
  marketSize?: number;
  keyVendors?: string[];
  buyingFrequency?: string;
  decisionMakers?: string[];
  painPoints?: string[];
}

export interface BuyerProfile {
  demographics: {
    companySize: { min: number; max: number };
    annualRevenue: { min: number; max: number };
    employeeCount: { min: number; max: number };
    geography: string[];
  };
  firmographics: {
    businessModel: string[];
    primaryServices: string[];
    customerBase: string[];
    operationalScale: string;
  };
  psychographics: {
    painPoints: string[];
    motivations: string[];
    decisionCriteria: string[];
    buyingProcess: string;
    budgetCycle: string;
  };
  behavioral: {
    digitalAdoption: string;
    informationSources: string[];
    buyingTimeline: string;
    decisionMakers: string[];
  };
  technographics: {
    currentTech: string[];
    techStack: string[];
    adoptionReadiness: string;
    integrationRequirements: string[];
  };
}

export interface SearchStrategy {
  keywords: {
    primary: string[];
    secondary: string[];
    negative: string[];
    longTail: string[];
  };
  targeting: {
    geoTargeting: string[];
    industryTargeting: string[];
    sizeTargeting: { min: number; max: number };
    excludeTerms: string[];
  };
  sources: {
    searchEngines: string[];
    directories: string[];
    social: string[];
    trade: string[];
  };
  filters: {
    domainAge?: { min: number };
    contentQuality: { min: number };
    contactInfo: boolean;
    businessIndicators: string[];
  };
}

export interface MarketAnalysisResponse {
  analysisId: string;
  industries: IndustryData[];
  totalMarkets: number;
  recommendedIndustries: IndustryData[];
}

export interface SubIndustryResponse {
  industry: string;
  subIndustries: SubIndustryData[];
  count: number;
}

export interface ProductDiscoveryResponse {
  industry: string;
  subIndustry: string;
  suggestedProducts: ProductData[];
  marketInsights: {
    marketSize: number;
    growthRate: number;
    keyTrends: string[];
    opportunityAreas: string[];
  };
}

export interface BuyerProfileResponse {
  product: string;
  industry: string;
  subIndustry: string;
  buyerProfile: BuyerProfile;
}

export interface SearchStrategyResponse {
  product: string;
  industry: string;
  searchStrategy: SearchStrategy;
}

export interface MarketStats {
  totalIndustriesAnalyzed: number;
  avgAnalysisTime: string;
  topIndustries: Array<{
    name: string;
    locations: number;
  }>;
  recentAnalyses: number;
  discoveryModelsCreated: number;
}

class MarketDiscoveryService {
  
  /**
   * Analyze market size based on criteria
   */
  async analyzeMarketSize(criteria: MarketCriteria): Promise<MarketAnalysisResponse> {
    try {
      const response = await api.post('/market-analysis/analyze-market-size', criteria);
      return response.data.data;
    } catch (error) {
      console.error('Error analyzing market size:', error);
      throw new Error('Failed to analyze market size');
    }
  }

  /**
   * Get sub-industries for a specific industry
   */
  async getSubIndustries(industry: string): Promise<SubIndustryResponse> {
    try {
      const response = await api.post('/market-analysis/sub-industries', { industry });
      return response.data.data;
    } catch (error) {
      console.error('Error getting sub-industries:', error);
      throw new Error('Failed to get sub-industries');
    }
  }

  /**
   * Discover products for a sub-industry
   */
  async discoverProducts(industry: string, subIndustry: string): Promise<ProductDiscoveryResponse> {
    try {
      const response = await api.post('/market-analysis/discover-products', {
        industry,
        subIndustry
      });
      return response.data.data;
    } catch (error) {
      console.error('Error discovering products:', error);
      throw new Error('Failed to discover products');
    }
  }

  /**
   * Generate buyer profile for a product
   */
  async generateBuyerProfile(product: string, industry: string, subIndustry: string): Promise<BuyerProfileResponse> {
    try {
      const response = await api.post('/market-analysis/buyer-profile', {
        product,
        industry,
        subIndustry
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating buyer profile:', error);
      throw new Error('Failed to generate buyer profile');
    }
  }

  /**
   * Create search strategy
   */
  async createSearchStrategy(buyerProfile: BuyerProfile, product: string, industry: string): Promise<SearchStrategyResponse> {
    try {
      const response = await api.post('/market-analysis/search-strategy', {
        buyerProfile,
        product,
        industry
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating search strategy:', error);
      throw new Error('Failed to create search strategy');
    }
  }

  /**
   * Get market analysis by ID
   */
  async getMarketAnalysisById(id: string): Promise<any> {
    try {
      const response = await api.get(`/market-analysis/analysis/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting market analysis:', error);
      throw new Error('Failed to get market analysis');
    }
  }

  /**
   * Get user's market analyses
   */
  async getUserMarketAnalyses(): Promise<{ analyses: any[]; count: number }> {
    try {
      const response = await api.get('/market-analysis/analyses');
      return response.data.data;
    } catch (error) {
      console.error('Error getting user market analyses:', error);
      throw new Error('Failed to get market analyses');
    }
  }

  /**
   * Get market stats for dashboard
   */
  async getMarketStats(): Promise<MarketStats> {
    try {
      const response = await api.get('/market-analysis/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error getting market stats:', error);
      throw new Error('Failed to get market stats');
    }
  }

  /**
   * Start discovery execution (combined model creation and execution)
   */
  async startDiscovery(data: {
    name: string;
    industry: string;
    subIndustry: string;
    product: string;
    buyerProfile: BuyerProfile;
    searchStrategy: SearchStrategy;
    marketSize?: number;
    config?: any;
  }): Promise<{ discoveryModel: any; execution: any }> {
    try {
      const response = await api.post('/market-analysis/start-discovery', data);
      return response.data.data;
    } catch (error) {
      console.error('Error starting discovery:', error);
      throw new Error('Failed to start discovery');
    }
  }

  /**
   * Get discovery execution progress
   */
  async getExecutionProgress(executionId: string): Promise<any> {
    try {
      const response = await api.get(`/market-analysis/execution/${executionId}/progress`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting execution progress:', error);
      throw new Error('Failed to get execution progress');
    }
  }

  /**
   * Get example market analysis results for demos/mockups
   */
  getExampleResults(): {
    industries: IndustryData[];
    subIndustries: SubIndustryData[];
    products: ProductData[];
    buyerProfile: BuyerProfile;
  } {
    return {
      industries: [
        {
          name: 'Plumbing, Heating, and Air-Conditioning Contractors',
          naicsCode: '238220',
          locationCount: 412000,
          description: 'Contractors specializing in plumbing, heating, and air conditioning systems',
          avgRevenue: 850000,
          growthRate: 3.2,
          competitionLevel: 'medium',
          marketSize: 124000000000,
          keyCharacteristics: ['Local service businesses', 'License required', 'Emergency services']
        },
        {
          name: 'Full-Service Restaurants',
          naicsCode: '722511',
          locationCount: 653000,
          description: 'Restaurants providing food services to patrons who order and are served while seated',
          avgRevenue: 1200000,
          growthRate: 2.8,
          competitionLevel: 'high',
          marketSize: 298000000000,
          keyCharacteristics: ['High competition', 'Labor intensive', 'Location dependent']
        }
      ],
      subIndustries: [
        {
          name: 'Commercial Plumbing',
          naicsCode: '238220-02',
          locationCount: 89000,
          description: 'Plumbing services for commercial and industrial properties',
          parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
          avgRevenue: 1200000,
          marketShare: 21.6,
          keyPlayers: ['ServiceMaster', 'Roto-Rooter', 'Local contractors'],
          buyingPatterns: ['Annual budget cycles', 'Emergency purchases']
        }
      ],
      products: [
        {
          name: 'High-pressure water jetting systems',
          category: 'Drain Cleaning Equipment',
          description: 'Professional-grade water jetting equipment for clearing commercial drains and sewers',
          targetMarket: 'Commercial plumbing contractors',
          avgPrice: { min: 15000, max: 50000 },
          marketSize: 2400000000,
          keyVendors: ['Spartan Tool', 'General Pipe Cleaners', 'Electric Eel'],
          buyingFrequency: 'every 5-7 years',
          decisionMakers: ['Owner', 'Operations Manager', 'Lead Technician'],
          painPoints: ['Equipment reliability', 'Training requirements', 'Maintenance costs']
        }
      ],
      buyerProfile: {
        demographics: {
          companySize: { min: 10, max: 100 },
          annualRevenue: { min: 1000000, max: 10000000 },
          employeeCount: { min: 5, max: 50 },
          geography: ['United States', 'Urban and suburban areas']
        },
        firmographics: {
          businessModel: ['B2B service provider', 'Contract-based'],
          primaryServices: ['Commercial plumbing', 'Emergency repairs', 'Maintenance contracts'],
          customerBase: ['Commercial properties', 'Industrial facilities', 'Municipal contracts'],
          operationalScale: 'Regional to metropolitan'
        },
        psychographics: {
          painPoints: ['Equipment downtime', 'High maintenance costs', 'Staff training'],
          motivations: ['Improve efficiency', 'Reduce costs', 'Competitive advantage'],
          decisionCriteria: ['ROI', 'Reliability', 'Vendor support'],
          buyingProcess: 'Research-heavy with multiple stakeholders',
          budgetCycle: 'Annual with emergency provisions'
        },
        behavioral: {
          digitalAdoption: 'mainstream',
          informationSources: ['Trade publications', 'Vendor demos', 'Peer recommendations'],
          buyingTimeline: '3-6 months for planned purchases',
          decisionMakers: ['Business owner', 'Operations manager', 'Lead technicians']
        },
        technographics: {
          currentTech: ['Basic equipment', 'Traditional methods', 'Some digital tools'],
          techStack: ['Scheduling software', 'Invoicing systems', 'Basic diagnostics'],
          adoptionReadiness: 'Open to proven technology with clear ROI',
          integrationRequirements: ['Easy integration', 'Minimal IT changes', 'Training support']
        }
      }
    };
  }
}

export const marketDiscoveryService = new MarketDiscoveryService();
export default marketDiscoveryService;
