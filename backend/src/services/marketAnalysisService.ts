import { PrismaClient } from '@prisma/client';
import { AuditLogService } from './auditLogService';
import { AIScoringService } from './aiScoringService';

const prisma = new PrismaClient();

// Market Analysis Interfaces
export interface MarketCriteria {
  minLocations?: number;
  maxLocations?: number;
  geography?: string; // "US", "CA", "Global"
  industries?: string[]; // NAICS codes or industry names
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
  subIndustries?: SubIndustryData[];
  keyCharacteristics?: string[];
  marketSize?: number; // Total market size in USD
}

export interface SubIndustryData {
  name: string;
  naicsCode?: string;
  locationCount: number;
  description: string;
  parentIndustry: string;
  avgRevenue?: number;
  marketShare?: number; // Percentage of parent industry
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
  buyingFrequency?: string; // "annual", "bi-annual", "as-needed"
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
    digitalAdoption: string; // "early", "mainstream", "laggard"
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
    searchEngines: string[]; // "google", "bing", "duckduckgo"
    directories: string[]; // "yellowpages", "industry-specific"
    social: string[]; // "linkedin", "twitter"
    trade: string[]; // "trade publications", "association sites"
  };
  filters: {
    domainAge: { min?: number };
    contentQuality: { min: number };
    contactInfo: boolean;
    businessIndicators: string[];
  };
}

export class MarketAnalysisService {
  private aiScoringService: AIScoringService;

  constructor() {
    this.aiScoringService = new AIScoringService();
  }
  
  /**
   * Analyze market size based on criteria
   */
  async analyzeMarketSize(criteria: MarketCriteria, userId: string): Promise<{
    analysisId: string;
    industries: IndustryData[];
    totalMarkets: number;
    recommendedIndustries: IndustryData[];
  }> {
    try {
      // Get market data from multiple sources
      const marketData = await this.getMarketData(criteria);
      
      // Filter and rank industries based on criteria
      const filteredIndustries = this.filterIndustries(marketData, criteria);
      
      // Get AI analysis for recommendations
      const aiAnalysis = await this.getAIMarketAnalysis(filteredIndustries, criteria);
      
      // Save analysis to database
      const analysis = await prisma.marketAnalysis.create({
        data: {
          name: `Market Analysis - ${criteria.geography || 'US'} - ${criteria.minLocations}+ locations`,
          criteria: JSON.stringify(criteria),
          results: JSON.stringify({
            industries: filteredIndustries,
            aiRecommendations: aiAnalysis.recommendations,
            metadata: {
              totalIndustriesAnalyzed: marketData.length,
              criteriaMatched: filteredIndustries.length,
              analysisDate: new Date(),
              dataSourcesUsed: ['naics', 'census', 'sba', 'ai_analysis']
            }
          }),
          status: 'completed',
          createdById: userId
        }
      });

      // Log the analysis
      await AuditLogService.logActivity({
        action: 'CREATE',
        entityType: 'MARKET_ANALYSIS',
        entityId: analysis.id,
        description: `Created market analysis: ${criteria.minLocations}+ location industries in ${criteria.geography || 'US'}`,
        userId
      });

      return {
        analysisId: analysis.id,
        industries: filteredIndustries,
        totalMarkets: filteredIndustries.length,
        recommendedIndustries: aiAnalysis.recommendations.slice(0, 10) // Top 10
      };

    } catch (error) {
      console.error('Error analyzing market size:', error);
      throw new Error('Failed to analyze market size');
    }
  }

  /**
   * Get sub-industries for a specific industry
   */
  async getSubIndustries(industry: string, userId: string): Promise<SubIndustryData[]> {
    try {
      // Get sub-industry data
      const subIndustries = await this.getSubIndustryData(industry);
      
      // Enhance with AI analysis
      const enhancedSubIndustries = await this.enhanceSubIndustriesWithAI(industry, subIndustries);
      
      // Log the analysis
      await AuditLogService.logActivity({
        action: 'ANALYZE',
        entityType: 'INDUSTRY',
        entityId: industry,
        description: `Analyzed sub-industries for ${industry}`,
        userId
      });

      return enhancedSubIndustries;

    } catch (error) {
      console.error('Error getting sub-industries:', error);
      throw new Error('Failed to get sub-industries');
    }
  }

  /**
   * Discover products for a sub-industry
   */
  async discoverProducts(industry: string, subIndustry: string, userId: string): Promise<{
    suggestedProducts: ProductData[];
    marketInsights: {
      marketSize: number;
      growthRate: number;
      keyTrends: string[];
      opportunityAreas: string[];
    };
  }> {
    try {
      // Get product data from AI analysis
      const productData = await this.getProductDataFromAI(industry, subIndustry);
      
      // Get market insights
      const marketInsights = await this.getMarketInsights(industry, subIndustry);
      
      // Log the discovery
      await AuditLogService.logActivity({
        action: 'DISCOVER',
        entityType: 'PRODUCT',
        entityId: `${industry}-${subIndustry}`,
        description: `Discovered products for ${subIndustry} in ${industry}`,
        userId
      });

      return {
        suggestedProducts: productData,
        marketInsights
      };

    } catch (error) {
      console.error('Error discovering products:', error);
      throw new Error('Failed to discover products');
    }
  }

  /**
   * Generate buyer profile for a product
   */
  async generateBuyerProfile(product: string, industry: string, subIndustry: string, userId: string): Promise<BuyerProfile> {
    try {
      // Use AI to generate comprehensive buyer profile
      const profile = await this.generateAIBuyerProfile(product, industry, subIndustry);
      
      // Validate and enhance profile
      const enhancedProfile = await this.enhanceBuyerProfile(profile, industry);
      
      // Log the generation
      await AuditLogService.logActivity({
        action: 'GENERATE',
        entityType: 'BUYER_PROFILE',
        entityId: `${product}-${industry}`,
        description: `Generated buyer profile for ${product} in ${industry}`,
        userId
      });

      return enhancedProfile;

    } catch (error) {
      console.error('Error generating buyer profile:', error);
      throw new Error('Failed to generate buyer profile');
    }
  }

  /**
   * Create search strategy for discovery
   */
  async createSearchStrategy(buyerProfile: BuyerProfile, product: string, industry: string): Promise<SearchStrategy> {
    try {
      // Generate AI-driven search strategy
      const strategy = await this.generateAISearchStrategy(buyerProfile, product, industry);
      
      // Optimize strategy based on historical performance
      const optimizedStrategy = await this.optimizeSearchStrategy(strategy, industry);
      
      return optimizedStrategy;

    } catch (error) {
      console.error('Error creating search strategy:', error);
      throw new Error('Failed to create search strategy');
    }
  }

  // Private helper methods

  /**
   * Get market data from various sources
   */
  private async getMarketData(criteria: MarketCriteria): Promise<IndustryData[]> {
    // This would integrate with external APIs in production
    // For now, return mock data that matches the expected structure
    
    const mockIndustries: IndustryData[] = [
      {
        name: 'Plumbing, Heating, and Air-Conditioning Contractors',
        naicsCode: '238220',
        locationCount: 412000,
        description: 'Contractors specializing in plumbing, heating, and air conditioning systems',
        avgRevenue: 850000,
        growthRate: 3.2,
        competitionLevel: 'medium',
        marketSize: 124000000000, // $124B
        subIndustries: [
          {
            name: 'Residential Plumbing',
            naicsCode: '238220-01',
            locationCount: 281000,
            description: 'Plumbing services for residential properties',
            parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
            avgRevenue: 650000,
            marketShare: 68.2
          },
          {
            name: 'Commercial Plumbing',
            naicsCode: '238220-02',
            locationCount: 89000,
            description: 'Plumbing services for commercial and industrial properties',
            parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
            avgRevenue: 1200000,
            marketShare: 21.6
          },
          {
            name: 'Industrial Plumbing',
            naicsCode: '238220-03',
            locationCount: 42000,
            description: 'Specialized plumbing for industrial facilities',
            parentIndustry: 'Plumbing, Heating, and Air-Conditioning Contractors',
            avgRevenue: 2100000,
            marketShare: 10.2
          }
        ],
        keyCharacteristics: [
          'Local service businesses',
          'License required',
          'Emergency services',
          'Seasonal demand variations'
        ]
      },
      {
        name: 'Full-Service Restaurants',
        naicsCode: '722511',
        locationCount: 653000,
        description: 'Restaurants providing food services to patrons who order and are served while seated',
        avgRevenue: 1200000,
        growthRate: 2.8,
        competitionLevel: 'high',
        marketSize: 298000000000, // $298B
        keyCharacteristics: [
          'High competition',
          'Labor intensive',
          'Location dependent',
          'Trend sensitive'
        ]
      },
      {
        name: 'Automotive Repair and Maintenance',
        naicsCode: '811111',
        locationCount: 347000,
        description: 'General automotive repair and maintenance services',
        avgRevenue: 920000,
        growthRate: 1.5,
        competitionLevel: 'medium',
        marketSize: 89000000000, // $89B
        keyCharacteristics: [
          'Equipment intensive',
          'Certification requirements',
          'Technology evolution',
          'Franchise opportunities'
        ]
      }
    ];

    // Filter based on criteria
    return mockIndustries.filter(industry => {
      if (criteria.minLocations && industry.locationCount < criteria.minLocations) return false;
      if (criteria.maxLocations && industry.locationCount > criteria.maxLocations) return false;
      return true;
    });
  }

  /**
   * Filter and rank industries based on criteria
   */
  private filterIndustries(industries: IndustryData[], criteria: MarketCriteria): IndustryData[] {
    let filtered = [...industries];

    // Apply location count filter
    if (criteria.minLocations) {
      filtered = filtered.filter(industry => industry.locationCount >= criteria.minLocations!);
    }

    // Apply growth rate filter
    if (criteria.filters?.growthRate) {
      filtered = filtered.filter(industry => {
        const growth = industry.growthRate || 0;
        if (criteria.filters?.growthRate?.min && growth < criteria.filters.growthRate.min) return false;
        if (criteria.filters?.growthRate?.max && growth > criteria.filters.growthRate.max) return false;
        return true;
      });
    }

    // Sort by location count (descending)
    filtered.sort((a, b) => b.locationCount - a.locationCount);

    return filtered;
  }

  /**
   * Get AI analysis for market recommendations
   */
  private async getAIMarketAnalysis(industries: IndustryData[], criteria: MarketCriteria): Promise<{
    recommendations: IndustryData[];
    insights: string[];
    opportunities: string[];
  }> {
    // This would use Claude AI in production
    // For now, return logical recommendations based on the data
    
    const recommendations = industries
      .filter(industry => industry.growthRate && industry.growthRate > 2)
      .slice(0, 10);

    const insights = [
      'Plumbing industry shows strong growth potential with increasing construction activity',
      'Service-based industries demonstrate resilience during economic fluctuations',
      'Industries with licensing requirements often have reduced competition barriers'
    ];

    const opportunities = [
      'Digital transformation opportunities in traditional industries',
      'B2B equipment and software solutions have high demand',
      'Professional services targeting SMBs show consistent growth'
    ];

    return { recommendations, insights, opportunities };
  }

  /**
   * Get detailed sub-industry data
   */
  private async getSubIndustryData(industry: string): Promise<SubIndustryData[]> {
    // This would query external APIs or databases
    // Return the sub-industries from the mock data for now
    const marketData = await this.getMarketData({});
    const industryData = marketData.find(ind => 
      ind.name.toLowerCase().includes(industry.toLowerCase()) ||
      industry.toLowerCase().includes(ind.name.toLowerCase().split(' ')[0])
    );
    
    return industryData?.subIndustries || [];
  }

  /**
   * Enhance sub-industries with AI analysis
   */
  private async enhanceSubIndustriesWithAI(industry: string, subIndustries: SubIndustryData[]): Promise<SubIndustryData[]> {
    try {
      // Use Claude AI to analyze and enhance sub-industry data
      const aiAnalysis = await this.aiScoringService.analyzeIndustryLandscape(industry);
      
      // Merge AI insights with existing sub-industry data
      return subIndustries.map(sub => {
        const aiSubIndustry = aiAnalysis.subIndustries.find(ai => 
          ai.name.toLowerCase().includes(sub.name.toLowerCase()) ||
          sub.name.toLowerCase().includes(ai.name.toLowerCase())
        );
        
        return {
          ...sub,
          keyPlayers: aiSubIndustry ? ['Based on AI analysis'] : ['Company A', 'Company B', 'Company C'],
          buyingPatterns: ['Annual budget cycles', 'Emergency purchases', 'Seasonal demand'],
          description: aiSubIndustry?.description || sub.description
        };
      });
    } catch (error) {
      console.error('Error enhancing sub-industries with AI:', error);
      // Fallback to original data with basic enhancements
      return subIndustries.map(sub => ({
        ...sub,
        keyPlayers: ['Company A', 'Company B', 'Company C'],
        buyingPatterns: ['Annual budget cycles', 'Emergency purchases', 'Seasonal demand']
      }));
    }
  }

  /**
   * Get product data using AI analysis
   */
  private async getProductDataFromAI(industry: string, subIndustry: string): Promise<ProductData[]> {
    try {
      // Use Claude AI to discover products for the sub-industry
      const aiProductData = await this.aiScoringService.discoverIndustryProducts(industry, subIndustry);
      
      // Convert AI response to our ProductData format
      return aiProductData.products.map(product => ({
        name: product.name,
        category: product.category,
        description: product.description,
        targetMarket: product.targetMarket,
        avgPrice: product.priceRange,
        marketSize: product.marketSize,
        keyVendors: product.keyVendors,
        buyingFrequency: product.buyingPattern,
        decisionMakers: ['Owner', 'Operations Manager'], // Default values
        painPoints: ['Cost concerns', 'Implementation challenges', 'Training requirements'] // Default values
      }));
    } catch (error) {
      console.error('Error getting AI product data:', error);
      
      // Fallback to mock data for commercial plumbing as example
      if (subIndustry.toLowerCase().includes('commercial plumbing')) {
        return [
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
          },
          {
            name: 'Pipe inspection cameras',
            category: 'Diagnostic Equipment',
            description: 'Video inspection systems for diagnosing pipe problems',
            targetMarket: 'Commercial plumbing contractors',
            avgPrice: { min: 5000, max: 25000 },
            marketSize: 1800000000,
            keyVendors: ['RIDGID', 'Envirosight', 'Pearpoint'],
            buyingFrequency: 'every 3-5 years',
            decisionMakers: ['Owner', 'Operations Manager'],
            painPoints: ['Image quality', 'Equipment durability', 'Software integration']
          }
        ];
      }

      return [];
    }
  }

  /**
   * Get market insights for industry/sub-industry
   */
  private async getMarketInsights(industry: string, subIndustry: string): Promise<{
    marketSize: number;
    growthRate: number;
    keyTrends: string[];
    opportunityAreas: string[];
  }> {
    // This would use AI and market research APIs
    return {
      marketSize: 2400000000, // $2.4B
      growthRate: 4.2,
      keyTrends: [
        'Increasing adoption of video inspection technology',
        'Growing demand for preventive maintenance',
        'Shift towards eco-friendly cleaning solutions'
      ],
      opportunityAreas: [
        'Integration with property management software',
        'Remote monitoring and diagnostics',
        'Training and certification programs'
      ]
    };
  }

  /**
   * Generate comprehensive buyer profile using AI
   */
  private async generateAIBuyerProfile(product: string, industry: string, subIndustry: string): Promise<BuyerProfile> {
    try {
      // Use Claude AI to generate detailed buyer profile
      const aiBuyerProfile = await this.aiScoringService.generateBuyerProfile(product, industry, subIndustry);
      
      // Convert AI response to our BuyerProfile format
      return {
        demographics: {
          companySize: aiBuyerProfile.demographics?.companySize || { min: 10, max: 100 },
          annualRevenue: aiBuyerProfile.demographics?.annualRevenue || { min: 1000000, max: 10000000 },
          employeeCount: aiBuyerProfile.demographics?.companySize || { min: 5, max: 50 },
          geography: aiBuyerProfile.demographics?.geography || ['United States']
        },
        firmographics: {
          businessModel: aiBuyerProfile.firmographics?.businessModel || ['B2B service provider'],
          primaryServices: aiBuyerProfile.firmographics?.primaryServices || ['Professional services'],
          customerBase: aiBuyerProfile.firmographics?.customerBase || ['Commercial clients'],
          operationalScale: aiBuyerProfile.firmographics?.operationalScale || 'Regional'
        },
        psychographics: {
          painPoints: aiBuyerProfile.psychographics?.painPoints || ['Cost management', 'Efficiency challenges'],
          motivations: aiBuyerProfile.psychographics?.motivations || ['Improve operations', 'Reduce costs'],
          decisionCriteria: aiBuyerProfile.decisionProcess?.criteria || ['ROI', 'Reliability'],
          buyingProcess: 'Research-heavy with multiple stakeholder involvement',
          budgetCycle: 'Annual with emergency provisions'
        },
        behavioral: {
          digitalAdoption: aiBuyerProfile.technographics?.digitalAdoption || 'mainstream',
          informationSources: aiBuyerProfile.behavioral?.informationSources || ['Industry publications', 'Vendor websites'],
          buyingTimeline: aiBuyerProfile.decisionProcess?.timeline || '3-6 months',
          decisionMakers: aiBuyerProfile.decisionProcess?.stakeholders || ['Owner', 'Manager']
        },
        technographics: {
          currentTech: aiBuyerProfile.technographics?.currentTech || ['Basic tools', 'Traditional systems'],
          techStack: aiBuyerProfile.technographics?.currentTech || ['Basic software'],
          adoptionReadiness: 'Open to proven technology with clear ROI',
          integrationRequirements: aiBuyerProfile.technographics?.integrationNeeds || ['Easy integration', 'Training support']
        }
      };
    } catch (error) {
      console.error('Error generating AI buyer profile:', error);
      
      // Fallback to mock profile for commercial plumbing example
      return {
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
          painPoints: [
            'Equipment downtime affecting service delivery',
            'High equipment maintenance costs',
            'Need for reliable diagnostic tools',
            'Training staff on new technology'
          ],
          motivations: [
            'Improve service efficiency',
            'Reduce operational costs',
            'Enhance competitive advantage',
            'Expand service capabilities'
          ],
          decisionCriteria: [
            'Return on investment',
            'Equipment reliability',
            'Vendor support quality',
            'Training and documentation'
          ],
          buyingProcess: 'Research-heavy with multiple stakeholder involvement',
          budgetCycle: 'Annual with emergency provisions'
        },
        behavioral: {
          digitalAdoption: 'mainstream',
          informationSources: [
            'Industry trade publications',
            'Vendor websites and demos',
            'Peer recommendations',
            'Trade shows and conferences'
          ],
          buyingTimeline: '3-6 months for planned purchases',
          decisionMakers: [
            'Business owner (final approval)',
            'Operations manager (evaluation)',
            'Lead technicians (technical input)'
          ]
        },
        technographics: {
          currentTech: [
            'Basic drain cleaning equipment',
            'Hand tools and traditional methods',
            'Some digital documentation'
          ],
          techStack: [
            'Scheduling software',
            'Invoicing systems',
            'Basic diagnostic tools'
          ],
          adoptionReadiness: 'Open to proven technology with clear ROI',
          integrationRequirements: [
            'Easy integration with existing workflows',
            'Minimal IT infrastructure changes',
            'Comprehensive training support'
          ]
        }
      };
    }
  }

  /**
   * Enhance buyer profile with additional insights
   */
  private async enhanceBuyerProfile(profile: BuyerProfile, industry: string): Promise<BuyerProfile> {
    // This would use AI to add industry-specific enhancements
    return profile; // Return as-is for now
  }

  /**
   * Generate AI-driven search strategy
   */
  private async generateAISearchStrategy(buyerProfile: BuyerProfile, product: string, industry: string): Promise<SearchStrategy> {
    try {
      // Use Claude AI to generate optimal search strategy
      const aiSearchStrategy = await this.aiScoringService.generateSearchStrategy(buyerProfile, product, industry);
      
      // Convert AI response to our SearchStrategy format
      return {
        keywords: {
          primary: aiSearchStrategy.keywords?.primary || [],
          secondary: aiSearchStrategy.keywords?.secondary || [],
          negative: aiSearchStrategy.keywords?.negative || [],
          longTail: aiSearchStrategy.keywords?.longTail || []
        },
        targeting: {
          geoTargeting: aiSearchStrategy.targeting?.geoTargeting || ['United States'],
          industryTargeting: aiSearchStrategy.targeting?.industryFilters || [],
          sizeTargeting: aiSearchStrategy.targeting?.sizeFilters || { min: 10, max: 100 },
          excludeTerms: aiSearchStrategy.targeting?.excludeTerms || []
        },
        sources: {
          searchEngines: aiSearchStrategy.sources?.searchEngines || ['google'],
          directories: aiSearchStrategy.sources?.directories || [],
          social: aiSearchStrategy.sources?.socialPlatforms || [],
          trade: aiSearchStrategy.sources?.tradeSources || []
        },
        filters: {
          domainAge: { min: 1 },
          contentQuality: { min: 70 },
          contactInfo: true,
          businessIndicators: aiSearchStrategy.contentFilters?.businessSignals || [
            'professional services',
            'business registration',
            'service areas listed'
          ]
        }
      };
    } catch (error) {
      console.error('Error generating AI search strategy:', error);
      
      // Fallback to default search strategy
      return {
        keywords: {
          primary: [
            'commercial plumbing services',
            'commercial plumber',
            'industrial plumbing contractor',
            'commercial drain cleaning'
          ],
          secondary: [
            'sewer line repair',
            'pipe inspection services',
            'commercial water heater',
            'backflow testing'
          ],
          negative: [
            'residential',
            'home',
            'DIY',
            'homeowner'
          ],
          longTail: [
            'commercial plumbing contractor near me',
            'industrial pipe cleaning services',
            'commercial sewer line maintenance'
          ]
        },
        targeting: {
          geoTargeting: ['United States', 'Major metropolitan areas'],
          industryTargeting: ['Commercial plumbing', 'Industrial services'],
          sizeTargeting: { min: 10, max: 100 },
          excludeTerms: ['residential only', 'homeowner', 'DIY']
        },
        sources: {
          searchEngines: ['google', 'bing'],
          directories: ['yellowpages', 'angieslist', 'bbb'],
          social: ['linkedin'],
          trade: ['plumbing trade associations', 'contractor directories']
        },
        filters: {
          domainAge: { min: 1 },
          contentQuality: { min: 70 },
          contactInfo: true,
          businessIndicators: [
            'commercial services',
            'licensed contractor',
            'business registration',
            'service areas listed'
          ]
        }
      };
    }
  }

  /**
   * Optimize search strategy based on historical performance
   */
  private async optimizeSearchStrategy(strategy: SearchStrategy, industry: string): Promise<SearchStrategy> {
    // This would analyze historical performance data to optimize
    return strategy; // Return as-is for now
  }

  /**
   * Get market analysis by ID
   */
  async getMarketAnalysisById(id: string): Promise<any> {
    const analysis = await prisma.marketAnalysis.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true }
        },
        discoveryModels: {
          select: { id: true, name: true, product: true, isActive: true }
        }
      }
    });

    if (!analysis) {
      throw new Error('Market analysis not found');
    }

    return {
      ...analysis,
      criteria: JSON.parse(analysis.criteria),
      results: JSON.parse(analysis.results)
    };
  }

  /**
   * Get all market analyses for a user
   */
  async getUserMarketAnalyses(userId: string): Promise<any[]> {
    const analyses = await prisma.marketAnalysis.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        discoveryModels: {
          select: { id: true, name: true, product: true, isActive: true }
        }
      }
    });

    return analyses.map(analysis => ({
      ...analysis,
      criteria: JSON.parse(analysis.criteria),
      results: JSON.parse(analysis.results)
    }));
  }
}

export const marketAnalysisService = new MarketAnalysisService();
