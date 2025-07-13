import { prisma } from '../index';

export interface IndustryExploration {
  id: string;
  industry: string;
  productVerticals: ProductVertical[];
  customerTypes: CustomerType[];
  createdAt: Date;
  updatedAt: Date;
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

export class AIDiscoveryService {
  /**
   * Start a new discovery session for industry exploration
   */
  static async startDiscoverySession(userId: string, industry: string): Promise<DiscoverySession> {
    const sessionId = `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: DiscoverySession = {
      id: sessionId,
      userId,
      industry,
      selectedCustomerTypes: [],
      conversationHistory: [],
      status: 'exploring',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate initial AI response
    const initialResponse = await this.generateIndustryIntroduction(industry);
    session.conversationHistory.push({
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: initialResponse,
      timestamp: new Date()
    });

    return session;
  }

  /**
   * Generate AI introduction for industry exploration
   */
  private static async generateIndustryIntroduction(industry: string): Promise<string> {
    const introductions = {
      'dental': `Welcome to the dental industry exploration! I can help you discover the most promising product verticals and customer segments in dentistry. 

Some key product verticals in dental include:
• CBCT (Cone Beam Computed Tomography) - 3D imaging systems
• Dental Lasers - Treatment and surgical lasers
• CAD/CAM Systems - Digital restoration technology
• Practice Management Software - Office automation
• Dental Implants - Surgical and restorative solutions

What specific area of dentistry interests you most? I can provide detailed insights on market opportunities, customer types, and buying behaviors.`,

      'construction': `Welcome to the construction industry exploration! I can help you identify the most valuable product verticals and customer segments in construction.

Some key product verticals in construction include:
• Excavators & Heavy Equipment - Earthmoving and site preparation
• Safety Equipment - PPE and safety systems
• Building Materials - Concrete, steel, lumber, etc.
• Construction Software - Project management and BIM
• HVAC Systems - Heating, ventilation, and air conditioning

What specific area of construction would you like to explore? I can provide market analysis, customer profiles, and buying patterns.`,

      'manufacturing': `Welcome to the manufacturing industry exploration! I can help you discover the most promising product verticals and customer segments in manufacturing.

Some key product verticals in manufacturing include:
• Industrial Automation - Robotics and control systems
• Quality Control Equipment - Inspection and testing
• CNC Machinery - Computer numerical control systems
• Industrial Software - ERP and MES systems
• Safety Equipment - Industrial safety and compliance

What specific area of manufacturing interests you? I can provide detailed market insights and customer analysis.`,

      'healthcare': `Welcome to the healthcare industry exploration! I can help you identify the most valuable product verticals and customer segments in healthcare.

Some key product verticals in healthcare include:
• Medical Imaging - MRI, CT, ultrasound systems
• Surgical Equipment - Operating room technology
• Patient Monitoring - ICU and bedside monitoring
• Healthcare IT - Electronic health records and systems
• Medical Devices - Diagnostic and therapeutic equipment

What specific area of healthcare would you like to explore? I can provide market analysis and customer insights.`
    };

    return introductions[industry.toLowerCase() as keyof typeof introductions] || 
           `Welcome to the ${industry} industry exploration! I can help you discover the most promising product verticals and customer segments. What specific area interests you most?`;
  }

  /**
   * Get product verticals for an industry
   */
  static async getProductVerticals(industry: string): Promise<ProductVertical[]> {
    const verticals = {
      'dental': [
        {
          id: 'cbct',
          name: 'CBCT Systems',
          description: '3D cone beam computed tomography for dental imaging',
          marketSize: '$1.2B',
          growthRate: '8.5% annually',
          customerTypes: [
            {
              id: 'dental_specialists',
              name: 'Dental Specialists',
              description: 'Endodontists, oral surgeons, and periodontists',
              characteristics: ['High-value procedures', 'Advanced imaging needs', 'Specialized practice'],
              buyingBehavior: 'High-end equipment focus, ROI-driven',
              marketSegment: 'Premium',
              estimatedValue: '$50K-$200K'
            },
            {
              id: 'general_dentists',
              name: 'General Dentists',
              description: 'General practice dentists with advanced imaging needs',
              characteristics: ['Growing practice', 'Modern technology adoption', 'Patient education focus'],
              buyingBehavior: 'Technology-forward, patient experience focus',
              marketSegment: 'Mid-market',
              estimatedValue: '$30K-$100K'
            }
          ]
        },
        {
          id: 'dental_lasers',
          name: 'Dental Lasers',
          description: 'Surgical and therapeutic laser systems for dental procedures',
          marketSize: '$800M',
          growthRate: '12% annually',
          customerTypes: [
            {
              id: 'cosmetic_dentists',
              name: 'Cosmetic Dentists',
              description: 'Dentists specializing in cosmetic and aesthetic procedures',
              characteristics: ['High-end clientele', 'Minimally invasive focus', 'Technology adoption'],
              buyingBehavior: 'Premium equipment, patient comfort focus',
              marketSegment: 'Premium',
              estimatedValue: '$40K-$150K'
            },
            {
              id: 'periodontists',
              name: 'Periodontists',
              description: 'Specialists in gum disease and periodontal surgery',
              characteristics: ['Surgical focus', 'Advanced procedures', 'Specialized practice'],
              buyingBehavior: 'Surgical precision, clinical outcomes',
              marketSegment: 'Specialist',
              estimatedValue: '$60K-$200K'
            }
          ]
        }
      ],
      'construction': [
        {
          id: 'excavators',
          name: 'Excavators & Heavy Equipment',
          description: 'Earthmoving and site preparation equipment',
          marketSize: '$15B',
          growthRate: '6% annually',
          customerTypes: [
            {
              id: 'construction_companies',
              name: 'Construction Companies',
              description: 'General contractors and construction firms',
              characteristics: ['Large projects', 'Equipment fleet', 'Project-based work'],
              buyingBehavior: 'ROI-focused, reliability critical',
              marketSegment: 'Commercial',
              estimatedValue: '$100K-$500K'
            },
            {
              id: 'excavation_specialists',
              name: 'Excavation Specialists',
              description: 'Specialized excavation and site preparation companies',
              characteristics: ['Specialized services', 'Equipment-intensive', 'Seasonal work'],
              buyingBehavior: 'Equipment reliability, service support',
              marketSegment: 'Specialist',
              estimatedValue: '$200K-$1M'
            }
          ]
        },
        {
          id: 'safety_equipment',
          name: 'Safety Equipment',
          description: 'PPE and safety systems for construction sites',
          marketSize: '$3.5B',
          growthRate: '9% annually',
          customerTypes: [
            {
              id: 'safety_managers',
              name: 'Safety Managers',
              description: 'Construction companies with dedicated safety programs',
              characteristics: ['Compliance focus', 'Employee safety', 'Risk management'],
              buyingBehavior: 'Compliance-driven, quality focus',
              marketSegment: 'Corporate',
              estimatedValue: '$10K-$100K'
            }
          ]
        }
      ]
    };

    return verticals[industry.toLowerCase() as keyof typeof verticals] || [];
  }

  /**
   * Add user message to discovery session
   */
  static async addUserMessage(sessionId: string, message: string): Promise<DiscoverySession> {
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    // Generate AI response based on conversation context
    const aiResponse = await this.generateAIResponse(sessionId, message);
    const aiMessage: ConversationMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: aiResponse.metadata
    };

    // Update session with new messages
    const session: DiscoverySession = {
      id: sessionId,
      userId: 'user_id', // This would come from the actual session
      industry: 'dental', // This would come from the actual session
      selectedCustomerTypes: [],
      conversationHistory: [userMessage, aiMessage],
      status: 'exploring',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return session;
  }

  /**
   * Generate AI response based on conversation context
   */
  private static async generateAIResponse(sessionId: string, userMessage: string): Promise<{
    content: string;
    metadata?: any;
  }> {
    // Simple response generation - in production, this would use Claude API
    const responses = [
      "I understand you're interested in that area. Let me provide some specific insights about market opportunities and customer types.",
      "Great choice! This product vertical has strong growth potential. Here are the key customer segments to target:",
      "Excellent selection. Based on market analysis, here are the most promising customer types for this vertical:",
      "Perfect! Let me break down the customer types and their characteristics for this product vertical."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      content: randomResponse,
      metadata: {
        suggestedCustomerTypes: [
          {
            id: 'customer_1',
            name: 'High-Value Customers',
            description: 'Premium customers with high purchasing power',
            estimatedValue: '$100K-$500K'
          },
          {
            id: 'customer_2', 
            name: 'Growth Customers',
            description: 'Expanding businesses with technology adoption focus',
            estimatedValue: '$50K-$200K'
          }
        ]
      }
    };
  }

  /**
   * Search for potential customers based on criteria
   */
  static async searchForCustomers(
    industry: string,
    productVertical: string,
    customerTypes: string[],
    constraints?: {
      geography?: string[];
      maxResults?: number;
      companySize?: string[];
    }
  ): Promise<WebSearchResult[]> {
    // This would integrate with web search APIs or scraping services
    // For now, return mock results based on industry and product vertical
    let mockResults: WebSearchResult[] = [];
    
    if (industry === 'dental' && productVertical === 'cbct') {
      mockResults = [
        {
          url: 'https://example-dental-practice.com',
          title: 'Advanced Dental Care Center',
          description: 'Modern dental practice specializing in advanced imaging and CBCT technology',
          relevanceScore: 0.95,
          location: 'New York, NY',
          companyType: 'Dental Practice'
        },
        {
          url: 'https://premium-dental-specialists.com',
          title: 'Premium Dental Specialists',
          description: 'Specialized dental practice with CBCT and advanced imaging systems',
          relevanceScore: 0.92,
          location: 'Los Angeles, CA',
          companyType: 'Dental Specialists'
        },
        {
          url: 'https://cosmetic-dental-experts.com',
          title: 'Cosmetic Dental Experts',
          description: 'High-end cosmetic dentistry practice with CBCT technology',
          relevanceScore: 0.88,
          location: 'Miami, FL',
          companyType: 'Cosmetic Dentistry'
        },
        {
          url: 'https://dental-imaging-center.com',
          title: 'Dental Imaging Center',
          description: 'Specialized dental imaging facility with CBCT and 3D scanning',
          relevanceScore: 0.85,
          location: 'Chicago, IL',
          companyType: 'Dental Imaging'
        },
        {
          url: 'https://advanced-dental-tech.com',
          title: 'Advanced Dental Technology',
          description: 'Modern dental practice with CBCT, laser, and digital workflow',
          relevanceScore: 0.82,
          location: 'Houston, TX',
          companyType: 'Dental Practice'
        }
      ];
    } else if (industry === 'dental' && productVertical === 'dental_lasers') {
      mockResults = [
        {
          url: 'https://laser-dental-specialists.com',
          title: 'Laser Dental Specialists',
          description: 'Specialized practice using advanced laser technology for treatments',
          relevanceScore: 0.94,
          location: 'San Francisco, CA',
          companyType: 'Dental Specialists'
        },
        {
          url: 'https://cosmetic-laser-dental.com',
          title: 'Cosmetic Laser Dental',
          description: 'High-end cosmetic dentistry with laser technology',
          relevanceScore: 0.91,
          location: 'Beverly Hills, CA',
          companyType: 'Cosmetic Dentistry'
        },
        {
          url: 'https://periodontal-laser-center.com',
          title: 'Periodontal Laser Center',
          description: 'Specialized periodontal practice with laser treatment systems',
          relevanceScore: 0.89,
          location: 'Boston, MA',
          companyType: 'Periodontal Practice'
        }
      ];
    } else if (industry === 'construction' && productVertical === 'excavators') {
      mockResults = [
        {
          url: 'https://construction-equipment.com',
          title: 'ABC Construction Company',
          description: 'Large construction firm with heavy equipment fleet',
          relevanceScore: 0.93,
          location: 'Dallas, TX',
          companyType: 'Construction Company'
        },
        {
          url: 'https://excavation-specialists.com',
          title: 'Excavation Specialists Inc',
          description: 'Specialized excavation and site preparation company',
          relevanceScore: 0.90,
          location: 'Phoenix, AZ',
          companyType: 'Excavation Company'
        }
      ];
    }

    // Apply constraints
    let filteredResults = mockResults;
    
    if (constraints?.maxResults) {
      filteredResults = filteredResults.slice(0, constraints.maxResults);
    }

    if (constraints?.geography && constraints.geography.length > 0) {
      filteredResults = filteredResults.filter(result => 
        constraints.geography!.some(geo => 
          result.location?.toLowerCase().includes(geo.toLowerCase())
        )
      );
    }

    return filteredResults;
  }
} 