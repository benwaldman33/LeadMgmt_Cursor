import { prisma } from '../index';
import { AIScoringService } from './aiScoringService';
import { webScrapingService } from './webScrapingService';
import axios from 'axios';

// Helper function to get configuration from database
async function getConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    return config?.value || null;
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return null;
  }
}

// Helper function to decrypt configuration if needed
async function getDecryptedConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    
    if (!config) return null;
    
    if (config.isEncrypted) {
      return '[ENCRYPTED]';
    }
    
    return config.value;
  } catch (error) {
    console.error(`Error getting decrypted config ${key}:`, error);
    return null;
  }
}

// Claude API call function
async function callClaudeAPI(prompt: string): Promise<any> {
  const CLAUDE_API_KEY = await getDecryptedConfig('Claude_API_Key') || await getDecryptedConfig('CLAUDE_API_KEY');
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === '[ENCRYPTED]') {
    throw new Error('Claude API key not configured');
  }

  const model = await getConfig('CLAUDE_MODEL') || 'claude-3-sonnet-20240229';
  const maxTokens = await getConfig('CLAUDE_MAX_TOKENS') || '4000';

  try {
    console.log(`[AI Discovery] Making Claude API request for customer search`);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: parseInt(maxTokens),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('[AI Discovery] Claude API request failed:', error);
    throw error;
  }
}

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

export interface HistoricalAnalysis {
  url: string;
  currentSnapshot: {
    content: string;
    keyPhrases: string[];
    technologies: string[];
    services: string[];
  };
  historicalSnapshots: {
    date: string;
    content: string;
    keyPhrases: string[];
    changes: string[];
  }[];
  messagingEvolution: {
    addedTechnologies: string[];
    removedTechnologies: string[];
    serviceChanges: string[];
    messagingShifts: string[];
  };
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
   * Get product verticals for an industry using Claude AI
   */
  static async getProductVerticals(industry: string): Promise<ProductVertical[]> {
    try {
      console.log(`[AI Discovery] Using Claude to discover product verticals for industry: ${industry}`);
      
      // Build Claude prompt for product vertical discovery
      const prompt = this.buildProductVerticalDiscoveryPrompt(industry);
      
      // Call Claude API for dynamic vertical discovery
      const claudeResponse = await callClaudeAPI(prompt);
      
      // Parse Claude's response into structured product verticals
      const verticals = this.parseClaudeProductVerticals(claudeResponse, industry);
      
      console.log(`[AI Discovery] Claude discovered ${verticals.length} product verticals for ${industry}`);
      
      return verticals;
      
    } catch (error) {
      console.error('[AI Discovery] Claude vertical discovery failed, falling back to mock data:', error);
      
      // Fallback to existing mock data
      return this.getMockProductVerticals(industry);
    }
  }

  /**
   * Build Claude prompt for product vertical discovery
   */
  private static buildProductVerticalDiscoveryPrompt(industry: string): string {
    return `You are an expert in market analysis and industry research. 

I need you to analyze the ${industry} industry and identify the most promising product verticals (specific product categories or service areas) within this industry.

Requirements:
- Industry: ${industry}
- Focus on high-growth, high-value product verticals
- Include market size estimates and growth rates
- Identify key customer types for each vertical
- Provide realistic market data

Please provide the product verticals in this JSON format:
[
  {
    "id": "unique_identifier",
    "name": "Product Vertical Name",
    "description": "Brief description of the product vertical",
    "marketSize": "Estimated market size (e.g., $1.2B)",
    "growthRate": "Annual growth rate (e.g., 8.5% annually)",
    "customerTypes": [
      {
        "id": "customer_type_id",
        "name": "Customer Type Name",
        "description": "Description of this customer segment",
        "characteristics": ["Characteristic 1", "Characteristic 2"],
        "buyingBehavior": "Description of buying behavior",
        "marketSegment": "Premium/Mid-market/Budget",
        "estimatedValue": "Estimated customer value (e.g., $50K-$200K)"
      }
    ]
  }
]

Focus on:
1. Product verticals that represent significant market opportunities
2. Realistic market sizes and growth rates
3. Specific customer types that would buy these products
4. High-value prospects with purchasing power
5. Current market trends and opportunities

Make sure the JSON is valid and properly formatted. Include 3-5 product verticals for this industry.`;
  }

  /**
   * Parse Claude's response into structured product verticals
   */
  private static parseClaudeProductVerticals(claudeResponse: any, industry: string): ProductVertical[] {
    try {
      const content = claudeResponse.content[0]?.text;
      
      // Extract JSON from Claude's response
      const jsonMatch = content?.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const verticals = JSON.parse(jsonMatch[0]);
      
      // Validate and transform the data
      return verticals.map((vertical: any, index: number) => ({
        id: vertical.id || `${industry}_vertical_${index}`,
        name: vertical.name || 'Unknown Vertical',
        description: vertical.description || 'No description available',
        marketSize: vertical.marketSize || '$Unknown',
        growthRate: vertical.growthRate || 'Unknown',
        customerTypes: (vertical.customerTypes || []).map((ct: any, ctIndex: number) => ({
          id: ct.id || `customer_${index}_${ctIndex}`,
          name: ct.name || 'Unknown Customer Type',
          description: ct.description || 'No description available',
          characteristics: ct.characteristics || [],
          buyingBehavior: ct.buyingBehavior || 'Unknown',
          marketSegment: ct.marketSegment || 'Unknown',
          estimatedValue: ct.estimatedValue || '$Unknown'
        }))
      }));
      
    } catch (error) {
      console.error('Error parsing Claude product verticals response:', error);
      throw new Error('Failed to parse Claude API response for product verticals');
    }
  }

  /**
   * Get mock product verticals (fallback method)
   */
  private static getMockProductVerticals(industry: string): ProductVertical[] {
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
  static async addUserMessage(sessionId: string, message: string, industry?: string, productVertical?: string): Promise<DiscoverySession> {
    // Get existing session (in a real app, this would be from database)
    // For now, we'll create a mock session with existing conversation
    const existingSession: DiscoverySession = {
      id: sessionId,
      userId: 'user_id',
      industry: industry || 'dental',
      productVertical: productVertical,
      selectedCustomerTypes: [],
      conversationHistory: [
        {
          id: 'msg_initial',
          role: 'assistant',
          content: `Welcome to the AI Discovery session for ${industry || 'your selected industry'}! I can help you explore customer opportunities and market insights. What would you like to know about your target customers?`,
          timestamp: new Date(Date.now() - 60000)
        }
      ],
      status: 'exploring',
      createdAt: new Date(Date.now() - 60000),
      updatedAt: new Date(Date.now() - 60000)
    };

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    // Generate AI response based on conversation context with industry/vertical awareness
    const aiResponse = await this.generateAIResponse(sessionId, message, industry, productVertical);
    const aiMessage: ConversationMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      metadata: aiResponse.metadata
    };

    // Update session with new messages appended to existing history
    const updatedSession: DiscoverySession = {
      ...existingSession,
      conversationHistory: [...existingSession.conversationHistory, userMessage, aiMessage],
      updatedAt: new Date()
    };

    return updatedSession;
  }

  /**
   * Generate automatic customer insights when product vertical is selected
   */
  static async generateCustomerInsights(industry: string, productVertical: string): Promise<{
    content: string;
    metadata?: any;
  }> {
    try {
      // Build Claude prompt for self-prompting analysis
      const prompt = this.buildSelfPromptingAnalysisPrompt(industry, productVertical);
      
      // Call Claude API for self-prompting analysis
      const claudeResponse = await callClaudeAPI(prompt);
      
      // Parse Claude's response
      const content = claudeResponse.content[0]?.text || this.getFallbackCustomerInsights(industry, productVertical);
      
      return {
        content: content,
        metadata: {
          industry: industry,
          productVertical: productVertical,
          customerTypes: [
            {
              id: 'primary_customers',
              name: 'Primary Customers',
              description: 'Main customer segments for this product vertical',
              estimatedValue: '$50K-$500K'
            },
            {
              id: 'secondary_customers', 
              name: 'Secondary Customers',
              description: 'Additional customer segments with growth potential',
              estimatedValue: '$25K-$200K'
            }
          ]
        }
      };
    } catch (error) {
      console.error('[AI Discovery] Claude self-prompting analysis failed, using fallback:', error);
      return {
        content: this.getFallbackCustomerInsights(industry, productVertical),
        metadata: {
          industry: industry,
          productVertical: productVertical
        }
      };
    }
  }

  /**
   * Build Claude prompt for self-prompting analysis
   */
  private static buildSelfPromptingAnalysisPrompt(industry: string, productVertical: string): string {
    return `You are an expert AI analyst specializing in B2B customer discovery and market research.

I need you to analyze ${productVertical} in the ${industry} industry, but instead of just providing information, I want you to:

1. **Ask yourself key questions** about the customer landscape
2. **Analyze the answers** to those questions
3. **Generate insights** based on your analysis
4. **Present your findings** in a conversational, analytical way

IMPORTANT: Focus on B2B customers (businesses that would buy this product), NOT end consumers.

Start by asking yourself these questions and then provide your analysis:

**Self-Analysis Questions:**
- Who are the primary B2B customers for ${productVertical} in ${industry}?
- What are their key characteristics and buying behaviors?
- What market opportunities exist for this product vertical?
- What are the main challenges and competitive factors?
- What customer segments have the highest growth potential?

**Your Task:**
1. Ask yourself these questions (or similar ones)
2. Analyze each question thoroughly
3. Provide your findings in a clear, analytical format
4. Include specific customer types, market insights, and opportunities

Format your response as if you're conducting a thorough market analysis and sharing your findings. Be conversational but analytical.`;
  }

  /**
   * Get fallback customer insights if Claude API fails
   */
  private static getFallbackCustomerInsights(industry: string, productVertical: string): string {
    const insights = {
      'food_beverage': {
        'plant_based_meat': `For Plant Based Meat in the Food & Beverage industry, your primary B2B customers include:

**Primary Customers:**
- Food Service Distributors: Large distributors supplying restaurants, cafeterias, and institutional kitchens
- Restaurant Chains: Fast-casual and fine dining establishments looking to expand plant-based menu options
- Food Manufacturers: Companies producing frozen meals, ready-to-eat products, and meal kits
- Retail Grocery Chains: Supermarket chains and specialty food retailers
- Food Service Providers: Catering companies, corporate dining services, and healthcare food services

**Customer Characteristics:**
- Focus on sustainability and health-conscious consumers
- Need for consistent supply and quality assurance
- Price-sensitive but willing to pay premium for quality
- Require certifications (organic, non-GMO, allergen-free)

**Buying Behavior:**
- Long-term contracts with volume commitments
- Require samples and product demonstrations
- Need comprehensive documentation and certifications
- Value supplier reliability and consistent quality

**Market Opportunities:**
- Growing demand for plant-based options in food service
- Increasing consumer awareness of health and sustainability
- Regulatory support for sustainable food production
- Strong growth in food service and retail segments`,
        'beverage_processing': `For Beverage Processing in the Food & Beverage industry, your primary B2B customers include:

**Primary Customers:**
- Beverage Manufacturers: Companies producing soft drinks, juices, and functional beverages
- Dairy Processors: Companies producing milk, yogurt, and dairy alternatives
- Craft Breweries: Small to medium-sized beer and cider producers
- Distilleries: Producers of spirits and alcoholic beverages
- Food Service Providers: Companies supplying beverages to restaurants and institutions

**Customer Characteristics:**
- Focus on efficiency and cost reduction
- Need for food safety compliance and quality control
- Require scalable solutions for production growth
- Value energy efficiency and sustainability

**Buying Behavior:**
- Capital-intensive purchases with long ROI periods
- Require extensive testing and validation
- Need comprehensive service and maintenance support
- Value supplier expertise and industry experience

**Market Opportunities:**
- Growing demand for functional and healthy beverages
- Increasing automation in beverage production
- Focus on sustainability and energy efficiency
- Strong growth in craft and specialty beverages`
      },
      'dental': {
        'cbct': `For CBCT Systems in the Dental industry, your primary B2B customers include:

**Primary Customers:**
- Dental Specialists: Endodontists, oral surgeons, and periodontists requiring advanced imaging
- Multi-location Dental Groups: Large practices with multiple locations
- Dental Schools: Educational institutions training future dentists
- Dental Laboratories: Companies providing custom dental prosthetics
- Dental Equipment Dealers: Distributors and resellers

**Customer Characteristics:**
- High-value procedures with premium pricing
- Advanced technology adoption and training needs
- Regulatory compliance requirements
- Focus on patient safety and diagnostic accuracy

**Buying Behavior:**
- Long sales cycles with multiple decision makers
- Require demonstrations and clinical validation
- Need comprehensive training and support
- Value ROI and clinical outcomes

**Market Opportunities:**
- Growing demand for advanced diagnostic imaging
- Increasing adoption in general dentistry
- Regulatory requirements for advanced imaging
- Strong growth in dental specialty markets`
      }
    };

    const industryInsights = insights[industry.toLowerCase() as keyof typeof insights];
    const verticalInsights = industryInsights?.[productVertical.toLowerCase() as keyof typeof industryInsights];
    
    return verticalInsights || `For ${productVertical} in the ${industry} industry, your primary B2B customers include manufacturers, distributors, and service providers in this sector. Focus on businesses that would integrate or resell your products, not end consumers.`;
  }

  /**
   * Generate AI response based on conversation context using Claude API
   */
  private static async generateAIResponse(sessionId: string, userMessage: string, industry?: string, productVertical?: string): Promise<{
    content: string;
    metadata?: any;
  }> {
    try {
      // Build Claude prompt for conversation response with context
      const prompt = this.buildConversationPrompt(userMessage, industry, productVertical);
      
      // Call Claude API for intelligent response
      const claudeResponse = await callClaudeAPI(prompt);
      
      // Parse Claude's response - keep it focused and concise
      const content = claudeResponse.content[0]?.text || this.getFallbackResponse(userMessage, industry, productVertical);
      
      // Only generate additional analysis for explicit follow-up requests or specific keywords
      const followUpKeywords = ['analyze', 'deep dive', 'detailed analysis', 'explore further', 'tell me more'];
      const hasExplicitFollowUpRequest = followUpKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );
      
      let additionalAnalysis = null;
      if (hasExplicitFollowUpRequest) {
        additionalAnalysis = await this.generateFollowUpAnalysis(userMessage, industry, productVertical);
      }
      
      const fullResponse = additionalAnalysis 
        ? `${content}\n\n${additionalAnalysis}`
        : content;
      
      return {
        content: fullResponse,
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
    } catch (error) {
      console.error('[AI Discovery] Claude conversation failed, using fallback:', error);
      return {
        content: this.getFallbackResponse(userMessage, industry, productVertical),
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
  }

  /**
   * Generate additional self-prompting analysis for follow-up questions
   */
  private static async generateFollowUpAnalysis(userMessage: string, industry?: string, productVertical?: string): Promise<string | null> {
    try {
      // Only generate additional analysis for explicit requests
      const explicitKeywords = ['analyze', 'deep dive', 'detailed analysis', 'explore further', 'tell me more', 'break down'];
      const hasExplicitRequest = explicitKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );
      
      if (!hasExplicitRequest) {
        return null;
      }

      const prompt = `You are analyzing ${productVertical || 'this product'} in the ${industry || 'this industry'} industry.

The user has explicitly requested deeper analysis: "${userMessage}"

Provide a focused, analytical response that:
1. Addresses the specific aspect they want analyzed
2. Provides concrete insights and data points
3. Identifies key customer segments and market opportunities
4. Suggests actionable next steps

Keep the analysis concise but thorough. Focus on practical insights that help with customer discovery.`;
      
      const claudeResponse = await callClaudeAPI(prompt);
      const analysis = claudeResponse.content[0]?.text;
      
      return analysis ? `\n\n**Detailed Analysis:**\n${analysis}` : null;
    } catch (error) {
      console.error('[AI Discovery] Follow-up analysis failed:', error);
      return null;
    }
  }

  /**
   * Build Claude prompt for conversation response
   */
  private static buildConversationPrompt(userMessage: string, industry?: string, productVertical?: string): string {
    // Add explicit system context at the top of every prompt
    let systemContext = 'SYSTEM MESSAGE: You are assisting a user with B2B lead discovery.';
    if (industry && productVertical) {
      systemContext += `\nThe user has selected the industry: ${industry}.`;
      systemContext += `\nThe user has selected the product vertical: ${productVertical}.`;
      systemContext += '\nAll your answers should be specific to this context.';
    } else if (industry) {
      systemContext += `\nThe user has selected the industry: ${industry}.`;
      systemContext += '\nAll your answers should be specific to this industry.';
    }
    systemContext += '\nAlways focus on B2B customers (businesses that would buy from manufacturers), not end consumers.';

    const context = industry && productVertical 
      ? `You are helping with customer discovery for ${productVertical} in the ${industry} industry. `
      : 'You are an expert AI assistant helping with customer discovery and market analysis. ';

    return `${systemContext}\n\n${context}

A user has asked: "${userMessage}"

Please provide a helpful, focused response that:
1. Addresses their specific question directly
2. Provides actionable insights about customer discovery for ${productVertical || 'this product'}
3. Suggests relevant customer types or market opportunities
4. Maintains a conversational, helpful tone
5. Keeps responses concise (2-3 sentences maximum)
6. Focuses on B2B customers (businesses that would buy the product), not end consumers
7. **Ask 1-2 follow-up questions** to help the user explore further

IMPORTANT: Keep your response brief and focused. Don't provide lengthy analysis unless specifically requested. The user should control the depth of exploration.

Format your response as: [Brief answer] + [1-2 follow-up questions to continue the conversation]`;
  }

  /**
   * Get fallback response if Claude API fails
   */
  private static getFallbackResponse(userMessage: string, industry?: string, productVertical?: string): string {
    const responses = [
      `I understand you're interested in ${productVertical || 'this area'}. Let me provide some specific insights about market opportunities and customer types.`,
      `Great question about ${productVertical || 'this product'}! This area has strong growth potential. Here are the key customer segments to target:`,
      `Excellent point about ${productVertical || 'this vertical'}. Based on market analysis, here are the most promising customer types:`,
      `Perfect! Let me break down the customer types and their characteristics for ${productVertical || 'this product vertical'}.`,
      `That's a great insight about ${productVertical || 'this market'}. Let me help you explore the customer opportunities.`
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    return randomResponse;
  }

  /**
   * Search for potential customers based on criteria using Claude AI
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
    try {
      console.log(`[AI Discovery] Searching for customers: ${industry}/${productVertical}`);
      
      // Build Claude prompt for customer search
      const prompt = this.buildCustomerSearchPrompt(industry, productVertical, customerTypes, constraints);
      
      // Call Claude API for real-time customer discovery
      const claudeResponse = await callClaudeAPI(prompt);
      
      // Parse Claude's response into structured results
      const results = this.parseClaudeCustomerResults(claudeResponse);
      
      // Enhance results with web scraping and historical analysis
      const enhancedResults = await this.enhanceResultsWithWebScraping(results, industry, productVertical);
      
      console.log(`[AI Discovery] Found ${enhancedResults.length} customers using Claude AI with web scraping`);
      
      return enhancedResults;
      
    } catch (error) {
      console.error('[AI Discovery] Claude search failed, falling back to mock data:', error);
      
      // Fallback to mock data if Claude fails
      return this.getMockResults(industry, productVertical, constraints);
    }
  }

  /**
   * Build Claude prompt for customer search
   */
  private static buildCustomerSearchPrompt(
    industry: string,
    productVertical: string,
    customerTypes: string[],
    constraints?: {
      geography?: string[];
      maxResults?: number;
      companySize?: string[];
    }
  ): string {
    const maxResults = constraints?.maxResults || 10;
    const geography = constraints?.geography?.join(', ') || 'United States';
    
    return `You are an expert in B2B customer discovery and market research. 

I need you to find potential B2B customers for ${productVertical} in the ${industry} industry.

IMPORTANT: We are looking for B2B customers (businesses that would BUY this product from manufacturers), NOT end consumers.

For example:
- If searching for "dental implants", we want DENTISTS who buy implants from manufacturers
- If searching for "dental lasers", we want DENTAL PRACTICES who buy laser equipment
- If searching for "construction equipment", we want CONSTRUCTION COMPANIES who buy equipment
- If searching for "manufacturing software", we want MANUFACTURERS who buy software

Requirements:
- Industry: ${industry}
- Product Vertical: ${productVertical}
- Customer Types: ${customerTypes.join(', ') || 'All relevant B2B customer types'}
- Geography: ${geography}
- Max Results: ${maxResults}

Please provide a list of potential B2B customers in this JSON format:
[
  {
    "url": "company website or LinkedIn",
    "title": "Company Name",
    "description": "Brief description of the company and why they would be interested in buying this product",
    "relevanceScore": 0.85,
    "location": "City, State",
    "companyType": "Type of B2B customer (e.g., Dental Practice, Construction Company, Manufacturer)"
  }
]

Focus on:
1. B2B customers that would actually BUY ${productVertical} from manufacturers
2. Real companies with online presence
3. High-value prospects with purchasing power
4. Companies in the specified geography
5. Relevance scores based on how likely they are to buy this product

Make sure the JSON is valid and properly formatted.`;
  }

  /**
   * Parse Claude's response into structured customer results
   */
  private static parseClaudeCustomerResults(claudeResponse: any): WebSearchResult[] {
    try {
      const content = claudeResponse.content[0]?.text;
      if (!content) {
        throw new Error('No content in Claude response');
      }

      // Extract JSON from Claude's response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in Claude response');
      }

      const results = JSON.parse(jsonMatch[0]);
      
      // Validate and format results
      return results.map((result: any, index: number) => ({
        url: result.url || `https://example-company-${index}.com`,
        title: result.title || `Company ${index + 1}`,
        description: result.description || 'Company description',
        relevanceScore: result.relevanceScore || 0.8,
        location: result.location || 'Unknown',
        companyType: result.companyType || 'Unknown'
      }));

    } catch (error) {
      console.error('[AI Discovery] Error parsing Claude response:', error);
      throw error;
    }
  }

  /**
   * Enhance search results with web scraping and historical analysis
   */
  private static async enhanceResultsWithWebScraping(
    results: WebSearchResult[], 
    industry: string, 
    productVertical: string
  ): Promise<WebSearchResult[]> {
    const enhancedResults: WebSearchResult[] = [];
    
    for (const result of results) {
      try {
        console.log(`[AI Discovery] Enhancing result: ${result.url}`);
        
        // Scrape current website
        const currentScraping = await webScrapingService.scrapeUrl(result.url, industry);
        
        if (currentScraping.success) {
          // Extract key phrases related to the product vertical
          const keyPhrases = this.extractKeyPhrases(currentScraping.content, productVertical);
          
          // Analyze historical content via Wayback Machine
          const historicalAnalysis = await this.analyzeHistoricalContent(result.url, productVertical);
          
          // Calculate relevance score based on content analysis
          const enhancedRelevanceScore = this.calculateEnhancedRelevanceScore(
            currentScraping.content,
            keyPhrases,
            historicalAnalysis,
            productVertical
          );
          
          enhancedResults.push({
            ...result,
            currentContent: currentScraping.content.substring(0, 2000), // Truncate for storage
            keyPhrases,
            relevanceScore: enhancedRelevanceScore,
            lastScraped: new Date(),
            contentChanges: {
              addedPhrases: historicalAnalysis.messagingEvolution.addedTechnologies,
              removedPhrases: historicalAnalysis.messagingEvolution.removedTechnologies,
              messagingEvolution: historicalAnalysis.messagingEvolution.serviceChanges.join(', ')
            },
            historicalContent: historicalAnalysis.historicalSnapshots.length > 0 
              ? historicalAnalysis.historicalSnapshots[0].content.substring(0, 2000) 
              : undefined
          });
        } else {
          // Keep original result if scraping fails
          enhancedResults.push(result);
        }
        
      } catch (error) {
        console.error(`[AI Discovery] Failed to enhance result ${result.url}:`, error);
        enhancedResults.push(result);
      }
    }
    
    return enhancedResults;
  }

  /**
   * Extract key phrases related to the product vertical from content
   */
  private static extractKeyPhrases(content: string, productVertical: string): string[] {
    const phrases: string[] = [];
    const lowerContent = content.toLowerCase();
    const lowerVertical = productVertical.toLowerCase();
    
    // Define key phrases based on product vertical - focusing on B2B customer indicators
    const verticalPhrases: { [key: string]: string[] } = {
      'cbct': [
        'cbct', 'cone beam', '3d imaging', 'dental imaging', 'ct scan', 'digital imaging',
        'advanced imaging', 'diagnostic imaging', '3d scanning', 'cone beam computed tomography'
      ],
      'dental_lasers': [
        'dental laser', 'laser treatment', 'laser therapy', 'soft tissue laser', 'hard tissue laser',
        'laser dentistry', 'laser surgery', 'laser procedures', 'laser technology'
      ],
      'cad_cam': [
        'cad/cam', 'digital restoration', 'crown', 'bridge', 'digital dentistry', 'milling',
        'digital crown', 'digital bridge', 'same day crown', 'digital restoration'
      ],
      'practice_management': [
        'practice management', 'dental software', 'patient management', 'scheduling', 'billing',
        'dental practice software', 'office management', 'dental practice management'
      ],
      'dental_implants': [
        'dental implants', 'implant surgery', 'restorative dentistry', 'osseointegration',
        'implant placement', 'implant restoration', 'dental implant surgery', 'implant dentistry'
      ],
      'orthodontics': [
        'orthodontics', 'braces', 'invisalign', 'clear aligners', 'orthodontic treatment',
        'orthodontic care', 'braces treatment', 'orthodontic services'
      ],
      'endodontics': [
        'endodontics', 'root canal', 'endodontic treatment', 'microscopic dentistry',
        'root canal therapy', 'endodontic care', 'root canal treatment'
      ],
      'periodontics': [
        'periodontics', 'gum disease', 'periodontal treatment', 'gum surgery',
        'periodontal care', 'gum disease treatment', 'periodontal surgery'
      ],
      // Construction examples
      'excavators': [
        'excavation', 'site preparation', 'earthmoving', 'excavation services',
        'site development', 'excavation equipment', 'earthmoving services'
      ],
      'safety_equipment': [
        'safety equipment', 'ppe', 'personal protective equipment', 'safety gear',
        'construction safety', 'safety compliance', 'safety training'
      ],
      // Manufacturing examples
      'industrial_automation': [
        'automation', 'industrial automation', 'robotics', 'automated systems',
        'manufacturing automation', 'automated production', 'industrial robotics'
      ],
      'quality_control': [
        'quality control', 'quality assurance', 'inspection', 'testing',
        'quality management', 'quality systems', 'quality testing'
      ]
    };
    
    const relevantPhrases = verticalPhrases[lowerVertical] || [lowerVertical];
    
    for (const phrase of relevantPhrases) {
      if (lowerContent.includes(phrase)) {
        phrases.push(phrase);
      }
    }
    
    // Also look for B2B customer indicators
    const b2bIndicators = [
      'services', 'solutions', 'equipment', 'technology', 'professional',
      'specialists', 'experts', 'certified', 'licensed', 'accredited',
      'practice', 'clinic', 'center', 'group', 'associates', 'partners'
    ];
    
    for (const indicator of b2bIndicators) {
      if (lowerContent.includes(indicator)) {
        phrases.push(indicator);
      }
    }
    
    return phrases;
  }

  /**
   * Analyze historical content via Wayback Machine
   */
  private static async analyzeHistoricalContent(url: string, productVertical: string): Promise<HistoricalAnalysis> {
    try {
      // Get Wayback Machine snapshots
      const waybackUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,original&collapse=timestamp:4`;
      const response = await axios.get(waybackUrl);
      
      if (!response.data || !Array.isArray(response.data) || response.data.length < 2) {
        return this.createEmptyHistoricalAnalysis();
      }
      
      const snapshots = response.data.slice(1) as any[]; // Remove header row
      const historicalSnapshots: any[] = [];
      
      // Get current content for comparison
      const currentScraping = await webScrapingService.scrapeUrl(url);
      const currentSnapshot = {
        content: currentScraping.content,
        keyPhrases: this.extractKeyPhrases(currentScraping.content, productVertical),
        technologies: currentScraping.structuredData.technologies || [],
        services: currentScraping.structuredData.services || []
      };
      
      // Analyze historical snapshots (limit to last 5 years, max 10 snapshots)
      const recentSnapshots = snapshots
        .filter((snapshot: any) => {
          const year = parseInt(snapshot[0].substring(0, 4));
          return year >= new Date().getFullYear() - 5;
        })
        .slice(0, 10);
      
      for (const snapshot of recentSnapshots) {
        try {
          const timestamp = snapshot[0] as string;
          const originalUrl = snapshot[1] as string;
          const waybackUrl = `http://web.archive.org/web/${timestamp}/${originalUrl}`;
          
          const historicalScraping = await webScrapingService.scrapeUrl(waybackUrl);
          
          if (historicalScraping.success) {
            historicalSnapshots.push({
              date: `${timestamp.substring(0, 4)}-${timestamp.substring(4, 6)}-${timestamp.substring(6, 8)}`,
              content: historicalScraping.content,
              keyPhrases: this.extractKeyPhrases(historicalScraping.content, productVertical),
              changes: this.detectContentChanges(currentSnapshot.content, historicalScraping.content, productVertical)
            });
          }
        } catch (error) {
          console.error(`[AI Discovery] Failed to analyze historical snapshot:`, error);
        }
      }
      
      // Analyze messaging evolution
      const messagingEvolution = this.analyzeMessagingEvolution(currentSnapshot, historicalSnapshots);
      
      return {
        url,
        currentSnapshot,
        historicalSnapshots,
        messagingEvolution
      };
      
    } catch (error) {
      console.error(`[AI Discovery] Historical analysis failed for ${url}:`, error);
      return this.createEmptyHistoricalAnalysis();
    }
  }

  /**
   * Detect content changes between current and historical content
   */
  private static detectContentChanges(currentContent: string, historicalContent: string, productVertical: string): string[] {
    const changes: string[] = [];
    const currentPhrases = this.extractKeyPhrases(currentContent, productVertical);
    const historicalPhrases = this.extractKeyPhrases(historicalContent, productVertical);
    
    // Find added phrases
    const addedPhrases = currentPhrases.filter(phrase => !historicalPhrases.includes(phrase));
    if (addedPhrases.length > 0) {
      changes.push(`Added key phrases: ${addedPhrases.join(', ')}`);
    }
    
    // Find removed phrases
    const removedPhrases = historicalPhrases.filter(phrase => !currentPhrases.includes(phrase));
    if (removedPhrases.length > 0) {
      changes.push(`Removed key phrases: ${removedPhrases.join(', ')}`);
    }
    
    return changes;
  }

  /**
   * Analyze messaging evolution over time
   */
  private static analyzeMessagingEvolution(currentSnapshot: any, historicalSnapshots: any[]): any {
    const evolution = {
      addedTechnologies: [] as string[],
      removedTechnologies: [] as string[],
      serviceChanges: [] as string[],
      messagingShifts: [] as string[]
    };
    
    if (historicalSnapshots.length === 0) {
      return evolution;
    }
    
    // Compare current vs historical
    const oldestSnapshot = historicalSnapshots[historicalSnapshots.length - 1];
    
    // Technology changes
    const currentTech = new Set(currentSnapshot.technologies);
    const historicalTech = new Set(oldestSnapshot.technologies || []);
    
    for (const tech of currentTech) {
      if (!historicalTech.has(tech as string)) {
        evolution.addedTechnologies.push(tech as string);
      }
    }
    
    for (const tech of historicalTech) {
      if (!currentTech.has(tech as string)) {
        evolution.removedTechnologies.push(tech as string);
      }
    }
    
    // Service changes
    if (currentSnapshot.services && oldestSnapshot.services) {
      const currentServices = new Set(currentSnapshot.services);
      const historicalServices = new Set(oldestSnapshot.services);
      
      for (const service of currentServices) {
        if (!historicalServices.has(service as string)) {
          evolution.serviceChanges.push(`Added: ${service as string}`);
        }
      }
      
      for (const service of historicalServices) {
        if (!currentServices.has(service as string)) {
          evolution.serviceChanges.push(`Removed: ${service as string}`);
        }
      }
    }
    
    return evolution;
  }

  /**
   * Calculate enhanced relevance score based on content analysis
   */
  private static calculateEnhancedRelevanceScore(
    content: string,
    keyPhrases: string[],
    historicalAnalysis: HistoricalAnalysis,
    productVertical: string
  ): number {
    let score = 0.5; // Base score
    
    // Content relevance (40% weight)
    const contentRelevance = keyPhrases.length / 10; // Normalize by expected phrase count
    score += contentRelevance * 0.4;
    
    // Historical evolution (30% weight)
    const evolutionScore = this.calculateEvolutionScore(historicalAnalysis);
    score += evolutionScore * 0.3;
    
    // Technology adoption (20% weight)
    const technologyScore = this.calculateTechnologyScore(historicalAnalysis, productVertical);
    score += technologyScore * 0.2;
    
    // Service alignment (10% weight)
    const serviceScore = this.calculateServiceScore(historicalAnalysis, productVertical);
    score += serviceScore * 0.1;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Calculate evolution score based on historical changes
   */
  private static calculateEvolutionScore(historicalAnalysis: HistoricalAnalysis): number {
    const { messagingEvolution } = historicalAnalysis;
    
    let score = 0.5; // Base score
    
    // Positive indicators
    if (messagingEvolution.addedTechnologies.length > 0) score += 0.2;
    if (messagingEvolution.serviceChanges.some(change => change.startsWith('Added:'))) score += 0.2;
    
    // Negative indicators
    if (messagingEvolution.removedTechnologies.length > 0) score -= 0.1;
    if (messagingEvolution.serviceChanges.some(change => change.startsWith('Removed:'))) score -= 0.1;
    
    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Calculate technology adoption score
   */
  private static calculateTechnologyScore(historicalAnalysis: HistoricalAnalysis, productVertical: string): number {
    const { currentSnapshot } = historicalAnalysis;
    const technologies = currentSnapshot.technologies || [];
    
    // Define relevant technologies for each vertical - focusing on B2B customer indicators
    const relevantTechnologies: { [key: string]: string[] } = {
      'cbct': ['cbct', '3d imaging', 'digital imaging', 'cone beam', 'imaging system', 'diagnostic'],
      'dental_lasers': ['laser', 'soft tissue', 'hard tissue', 'laser system', 'laser technology'],
      'cad_cam': ['cad/cam', 'digital restoration', 'milling', 'crown', 'digital dentistry', 'restoration'],
      'practice_management': ['software', 'management', 'digital', 'practice management', 'patient management'],
      'dental_implants': ['implant', 'surgery', 'restorative', 'implant system', 'surgical'],
      'orthodontics': ['orthodontics', 'braces', 'aligners', 'orthodontic', 'alignment'],
      'endodontics': ['endodontics', 'microscopic', 'root canal', 'endodontic', 'microscopy'],
      'periodontics': ['periodontics', 'gum disease', 'surgery', 'periodontal', 'gum'],
      // Construction examples
      'excavators': ['excavation', 'earthmoving', 'site preparation', 'excavation equipment', 'heavy equipment'],
      'safety_equipment': ['safety', 'ppe', 'protective', 'safety equipment', 'safety gear'],
      // Manufacturing examples
      'industrial_automation': ['automation', 'robotics', 'automated', 'industrial', 'manufacturing'],
      'quality_control': ['quality', 'inspection', 'testing', 'quality control', 'quality assurance']
    };
    
    const relevantTech = relevantTechnologies[productVertical] || [];
    const matchingTech = technologies.filter(tech => 
      relevantTech.some(relevant => tech.toLowerCase().includes(relevant))
    );
    
    return Math.min(matchingTech.length / Math.max(relevantTech.length, 1), 1.0);
  }

  /**
   * Calculate service alignment score
   */
  private static calculateServiceScore(historicalAnalysis: HistoricalAnalysis, productVertical: string): number {
    const { currentSnapshot } = historicalAnalysis;
    const services = currentSnapshot.services || [];
    
    // Define relevant services for each vertical - focusing on B2B customer indicators
    const relevantServices: { [key: string]: string[] } = {
      'cbct': ['imaging', 'diagnostic', '3d', 'scanning', 'diagnostic imaging', 'advanced imaging'],
      'dental_lasers': ['laser treatment', 'therapy', 'surgery', 'laser procedures', 'laser therapy'],
      'cad_cam': ['restoration', 'crown', 'bridge', 'milling', 'digital restoration', 'same day crown'],
      'practice_management': ['management', 'software', 'digital', 'practice management', 'patient management'],
      'dental_implants': ['implant', 'surgery', 'restorative', 'implant placement', 'implant restoration'],
      'orthodontics': ['orthodontics', 'braces', 'alignment', 'orthodontic treatment', 'braces treatment'],
      'endodontics': ['endodontics', 'root canal', 'treatment', 'endodontic treatment', 'root canal therapy'],
      'periodontics': ['periodontics', 'gum disease', 'surgery', 'periodontal treatment', 'gum surgery'],
      // Construction examples
      'excavators': ['excavation', 'site preparation', 'earthmoving', 'excavation services', 'site development'],
      'safety_equipment': ['safety', 'ppe', 'safety training', 'safety compliance', 'safety services'],
      // Manufacturing examples
      'industrial_automation': ['automation', 'manufacturing', 'production', 'automated systems', 'industrial'],
      'quality_control': ['quality', 'inspection', 'testing', 'quality control', 'quality assurance']
    };
    
    const relevantServicesList = relevantServices[productVertical] || [];
    const matchingServices = services.filter(service => 
      relevantServicesList.some(relevant => service.toLowerCase().includes(relevant))
    );
    
    return Math.min(matchingServices.length / Math.max(relevantServicesList.length, 1), 1.0);
  }

  /**
   * Create empty historical analysis for fallback
   */
  private static createEmptyHistoricalAnalysis(): HistoricalAnalysis {
    return {
      url: '',
      currentSnapshot: {
        content: '',
        keyPhrases: [],
        technologies: [],
        services: []
      },
      historicalSnapshots: [],
      messagingEvolution: {
        addedTechnologies: [],
        removedTechnologies: [],
        serviceChanges: [],
        messagingShifts: []
      }
    };
  }

  /**
   * Fallback mock results
   */
  private static getMockResults(
    industry: string,
    productVertical: string,
    constraints?: {
      geography?: string[];
      maxResults?: number;
      companySize?: string[];
    }
  ): WebSearchResult[] {
    let mockResults: WebSearchResult[] = [];
    
    if (industry === 'dental' && productVertical === 'cbct') {
      mockResults = [
        {
          url: 'https://advanceddentalcare.com',
          title: 'Advanced Dental Care Center',
          description: 'Modern dental practice specializing in advanced imaging and CBCT technology for comprehensive patient care',
          relevanceScore: 0.95,
          location: 'New York, NY',
          companyType: 'Dental Practice',
          keyPhrases: ['cbct', '3d imaging', 'advanced imaging', 'diagnostic imaging'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['cbct', '3d imaging'],
            removedPhrases: ['traditional x-ray'],
            messagingEvolution: 'Upgraded from traditional x-ray to CBCT technology'
          }
        },
        {
          url: 'https://premiumdental.com',
          title: 'Premium Dental Specialists',
          description: 'Specialized dental practice with CBCT and advanced imaging systems for precise diagnostics',
          relevanceScore: 0.92,
          location: 'Los Angeles, CA',
          companyType: 'Dental Specialists',
          keyPhrases: ['cbct', 'cone beam', 'digital imaging', 'diagnostic'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['cone beam', 'digital imaging'],
            removedPhrases: [],
            messagingEvolution: 'Added advanced diagnostic imaging capabilities'
          }
        },
        {
          url: 'https://cosmeticdental.com',
          title: 'Cosmetic Dental Experts',
          description: 'High-end cosmetic dentistry practice with CBCT technology for treatment planning',
          relevanceScore: 0.88,
          location: 'Miami, FL',
          companyType: 'Cosmetic Dentistry',
          keyPhrases: ['cbct', '3d scanning', 'treatment planning'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['3d scanning', 'treatment planning'],
            removedPhrases: [],
            messagingEvolution: 'Enhanced treatment planning with 3D technology'
          }
        }
      ];
    } else if (industry === 'dental' && productVertical === 'dental_implants') {
      mockResults = [
        {
          url: 'https://implantdental.com',
          title: 'Implant Dental Center',
          description: 'Specialized dental practice focusing on implant surgery and restorative dentistry',
          relevanceScore: 0.94,
          location: 'San Francisco, CA',
          companyType: 'Dental Practice',
          keyPhrases: ['dental implants', 'implant surgery', 'restorative dentistry'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['implant surgery', 'osseointegration'],
            removedPhrases: [],
            messagingEvolution: 'Expanded implant services with advanced surgical techniques'
          }
        },
        {
          url: 'https://restorativedental.com',
          title: 'Restorative Dental Group',
          description: 'Comprehensive dental practice with advanced implant and restorative services',
          relevanceScore: 0.91,
          location: 'Chicago, IL',
          companyType: 'Dental Practice',
          keyPhrases: ['dental implants', 'restorative', 'implant placement'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['implant placement', 'restorative'],
            removedPhrases: [],
            messagingEvolution: 'Enhanced restorative services with implant technology'
          }
        }
      ];
    } else if (industry === 'construction' && productVertical === 'excavators') {
      mockResults = [
        {
          url: 'https://earthmovingcontractors.com',
          title: 'Earthmoving Contractors Inc.',
          description: 'Professional excavation and site preparation company with heavy equipment fleet',
          relevanceScore: 0.93,
          location: 'Houston, TX',
          companyType: 'Construction Company',
          keyPhrases: ['excavation', 'site preparation', 'earthmoving', 'excavation services'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['excavation services', 'site preparation'],
            removedPhrases: [],
            messagingEvolution: 'Expanded excavation and site preparation services'
          }
        },
        {
          url: 'https://siteexcavation.com',
          title: 'Site Excavation Specialists',
          description: 'Specialized excavation company providing comprehensive site development services',
          relevanceScore: 0.89,
          location: 'Dallas, TX',
          companyType: 'Excavation Company',
          keyPhrases: ['excavation', 'site development', 'earthmoving services'],
          lastScraped: new Date(),
          contentChanges: {
            addedPhrases: ['site development', 'earthmoving services'],
            removedPhrases: [],
            messagingEvolution: 'Added comprehensive site development capabilities'
          }
        }
      ];
    }
    
    return mockResults;
  }
} 