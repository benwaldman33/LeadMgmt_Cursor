import { prisma } from '../index';
import { AIScoringService } from './aiScoringService';
import { ServiceConfigurationService } from './serviceConfigurationService';

// Helper function to decrypt sensitive values
function decryptValue(encryptedValue: string): string {
  console.log('[Decrypt] === DECRYPTION START ===');
  console.log('[Decrypt] Input value length:', encryptedValue ? encryptedValue.length : 0);
  console.log('[Decrypt] Input value starts with:', encryptedValue ? encryptedValue.substring(0, 20) + '...' : 'none');
  
  // If it looks like an API key that was stored directly, return it
  if (encryptedValue.startsWith('sk-ant-')) {
    console.log('[Decrypt] Value appears to be a direct API key, returning as-is');
    return encryptedValue;
  }
  
  // If it's the placeholder, we need to get the actual value from the database
  if (encryptedValue === '[ENCRYPTED]') {
    console.log('[Decrypt] Value is [ENCRYPTED] placeholder, need to get actual value');
    return '[ENCRYPTED]'; // This will be handled by the calling function
  }
  
  try {
    console.log('[Decrypt] Attempting to decrypt encrypted value...');
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
    console.log('[Decrypt] Using encryption key:', encryptionKey === 'default-key' ? 'DEFAULT (WARNING!)' : 'Custom key');
    
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const parts = encryptedValue.split(':');
    
    console.log('[Decrypt] Split parts count:', parts.length);
    
    if (parts.length !== 2) {
      console.log('[Decrypt] Value not properly formatted for decryption, returning as-is');
      return encryptedValue;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    console.log('[Decrypt] IV length:', iv.length, 'Encrypted length:', encrypted.length);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('[Decrypt] Decryption successful, result length:', decrypted.length);
    console.log('[Decrypt] === DECRYPTION SUCCESS ===');
    return decrypted;
  } catch (error) {
    console.error('[Decrypt] === DECRYPTION FAILED ===');
    console.error('[Decrypt] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
    });
    
    // If decryption fails and it looks like an API key, return it directly
    if (encryptedValue.startsWith('sk-ant-')) {
      console.log('[Decrypt] Returning as-is due to API key format');
      return encryptedValue;
    }
    
    console.log('[Decrypt] Returning [ENCRYPTED] placeholder');
    return '[ENCRYPTED]';
  }
}

// Helper function to get configuration (non-encrypted)
async function getConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    
    return config ? config.value : null;
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return null;
  }
}

// Helper function to decrypt configuration if needed
async function getDecryptedConfig(key: string): Promise<string | null> {
  try {
    console.log(`[Config] Getting decrypted config for key: ${key}`);
    
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    
    if (!config) {
      console.log(`[Config] No config found for key: ${key}`);
      return null;
    }
    
    console.log(`[Config] Config found for ${key}:`, {
      isEncrypted: config.isEncrypted,
      valueLength: config.value ? config.value.length : 0,
      valueStartsWith: config.value ? config.value.substring(0, 20) + '...' : 'none'
    });
    
    if (config.isEncrypted) {
      console.log(`[Config] Decrypting encrypted value for ${key}`);
      const decrypted = decryptValue(config.value);
      console.log(`[Config] Decryption result for ${key}:`, {
        resultLength: decrypted ? decrypted.length : 0,
        resultStartsWith: decrypted ? decrypted.substring(0, 20) + '...' : 'none',
        isEncryptedPlaceholder: decrypted === '[ENCRYPTED]'
      });
      
      // If decryption returned [ENCRYPTED] placeholder, the actual value might be stored differently
      if (decrypted === '[ENCRYPTED]') {
        console.log(`[Config] Decryption returned [ENCRYPTED] placeholder for ${key}, checking if value is stored as-is`);
        
        // Check if the actual value is stored directly (not encrypted)
        if (config.value && config.value.startsWith('sk-ant-')) {
          console.log(`[Config] Found actual API key stored directly for ${key}, returning it`);
          return config.value;
        }
        
        // If still [ENCRYPTED], we need to get the real value from somewhere else
        console.log(`[Config] Still getting [ENCRYPTED] for ${key}, this indicates a configuration issue`);
        return null;
      }
      
      return decrypted;
    }
    
    console.log(`[Config] Returning non-encrypted value for ${key}`);
    return config.value;
  } catch (error) {
    console.error(`[Config] Error getting decrypted config ${key}:`, error);
    return null;
  }
}

// Claude API call function
async function callClaudeAPI(prompt: string): Promise<any> {
  console.log('[AI Discovery] === CLAUDE API CALL START ===');
  
  // Get and log API key status - try multiple sources
  let CLAUDE_API_KEY = await getDecryptedConfig('Claude_API_Key') || await getDecryptedConfig('CLAUDE_API_KEY');
  
  // Fallback: try to get the API key directly from the database if decryption failed
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === '[ENCRYPTED]') {
    console.log('[AI Discovery] Primary config failed, trying direct database lookup...');
    try {
      const directConfig = await prisma.systemConfig.findFirst({
        where: { 
          key: { in: ['CLAUDE_API_KEY', 'Claude_API_Key'] },
          value: { startsWith: 'sk-ant-' }
        }
      });
      
      if (directConfig) {
        CLAUDE_API_KEY = directConfig.value;
        console.log('[AI Discovery] Found API key directly in database:', {
          key: directConfig.key,
          valueLength: directConfig.value.length,
          valueStartsWith: directConfig.value.substring(0, 10) + '...'
        });
      }
    } catch (fallbackError) {
      console.error('[AI Discovery] Fallback database lookup failed:', fallbackError);
    }
  }
  
  console.log('[AI Discovery] Claude API key status:', {
    hasKey: !!CLAUDE_API_KEY,
    keyLength: CLAUDE_API_KEY ? CLAUDE_API_KEY.length : 0,
    keyStartsWith: CLAUDE_API_KEY ? CLAUDE_API_KEY.substring(0, 10) + '...' : 'none',
    isEncrypted: CLAUDE_API_KEY === '[ENCRYPTED]'
  });
  
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === '[ENCRYPTED]') {
    console.error('[AI Discovery] Claude API key not configured or decryption failed');
    throw new Error('Claude API key not configured');
  }

  const model = await getConfig('CLAUDE_MODEL') || 'claude-3-sonnet-20240229';
  const maxTokens = await getConfig('CLAUDE_MAX_TOKENS') || '4000';
  
  console.log('[AI Discovery] Claude configuration:', { model, maxTokens });

  try {
    console.log(`[AI Discovery] Making Claude API request for industry discovery`);
    console.log(`[AI Discovery] API endpoint: https://api.anthropic.com/v1/messages`);
    console.log(`[AI Discovery] Request payload length: ${prompt.length} characters`);
    
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

    console.log(`[AI Discovery] Claude API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Discovery] Claude API error response:`, errorText);
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`[AI Discovery] Claude API response received, content length: ${JSON.stringify(responseData).length}`);
    console.log('[AI Discovery] === CLAUDE API CALL SUCCESS ===');
    return responseData;
  } catch (error) {
    console.error('[AI Discovery] Claude API request failed:', error);
    console.error('[AI Discovery] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    console.log('[AI Discovery] === CLAUDE API CALL FAILED ===');
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
   * Get available industries from database
   */
  static async getIndustries(): Promise<any[]> {
    try {
      const industries = await prisma.industry.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      
      return industries;
    } catch (error) {
      console.error('[AI Discovery] Error fetching industries:', error);
      throw error;
    }
  }

  /**
   * Get product verticals for an industry from database
   */
  static async getProductVerticals(industryId: string): Promise<ProductVertical[]> {
    try {
      // First check if the industry exists
      const industry = await prisma.industry.findFirst({
        where: { id: industryId, isActive: true }
      });

      if (!industry) {
        throw new Error(`Industry with ID '${industryId}' not found`);
      }

      const verticals = await prisma.productVertical.findMany({
        where: { 
          industryId: industry.id,
          isActive: true 
        },
        include: {
          customerTypes: {
            where: { isActive: true },
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });

      return verticals;
    } catch (error) {
      console.error('[AI Discovery] Error fetching product verticals:', error);
      throw error;
    }
  }

  /**
   * Start a new discovery session and save to database
   */
  static async startDiscoverySession(userId: string, industryId: string): Promise<DiscoverySession> {
    try {
      // First get the industry details
      const industry = await prisma.industry.findFirst({
        where: { id: industryId, isActive: true }
      });

      if (!industry) {
        throw new Error(`Industry with ID '${industryId}' not found`);
      }

      // Create discovery session in database
      const session = await prisma.discoverySession.create({
        data: {
          userId,
          industry: industry.name, // Store the industry name
          status: 'exploring'
        }
      });

      // Generate initial AI response using industry name
      const initialResponse = await this.generateIndustryIntroduction(industry.name);
      
      // Save initial AI message to database
      await prisma.conversationMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: initialResponse,
          timestamp: new Date()
        }
      });

      // Return session with conversation history
      const sessionWithHistory = await prisma.discoverySession.findUnique({
        where: { id: session.id },
        include: {
          conversationHistory: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      return sessionWithHistory as DiscoverySession;
    } catch (error) {
      console.error('[AI Discovery] Error starting discovery session:', error);
      throw error;
    }
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

What specific area of healthcare would you like to explore? I can provide market analysis and customer insights.`,

      'food_beverage': `Welcome to the Food & Beverage industry exploration! I can help you discover the most promising product verticals and customer segments in food processing and beverage manufacturing.

Some key product verticals include:
• Plant Based Meat - Alternative protein processing equipment
• Beverage Processing - Manufacturing and packaging systems
• Food Safety Equipment - Quality control and testing
• Packaging Solutions - Sustainable and efficient packaging
• Process Automation - Production line optimization

What specific area interests you most? I can provide detailed insights on market opportunities and customer types.`,

      'distribution_warehouse': `Welcome to the Distribution & Warehouse industry exploration! I can help you identify the most valuable product verticals and customer segments in logistics and warehouse automation.

Some key product verticals include:
• Warehouse Management Systems - Inventory and order management
• Material Handling Equipment - Conveyors, forklifts, robotics
• Automation Solutions - Picking, sorting, and packaging
• Supply Chain Software - Logistics and tracking systems
• Safety Equipment - Warehouse safety and compliance

What specific area would you like to explore? I can provide market analysis and customer insights.`
    };

    return introductions[industry.toLowerCase().replace(/\s+/g, '_') as keyof typeof introductions] || 
           `Welcome to the ${industry} industry exploration! I can help you discover the most promising product verticals and customer segments. What specific area interests you most?`;
  }

  /**
   * Add user message to discovery session and save to database
   */
  static async addUserMessage(sessionId: string, message: string, industry?: string, productVertical?: string): Promise<DiscoverySession> {
    try {
      // Get existing session
      const existingSession = await prisma.discoverySession.findUnique({
        where: { id: sessionId },
        include: {
          conversationHistory: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!existingSession) {
        throw new Error('Discovery session not found');
      }

      // Add user message to database
      await prisma.conversationMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: message,
          timestamp: new Date()
        }
      });

      // Generate AI response based on conversation context
      const aiResponse = await this.generateAIResponse(sessionId, message, industry, productVertical);
      
      // Save AI response to database
      await prisma.conversationMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          metadata: aiResponse.metadata ? JSON.stringify(aiResponse.metadata) : null
        }
      });

      // Update session status if product vertical is selected
      if (productVertical && existingSession.status === 'exploring') {
        await prisma.discoverySession.update({
          where: { id: sessionId },
          data: { 
            productVertical,
            status: 'product_selection',
            updatedAt: new Date()
          }
        });
      }

      // Return updated session with conversation history
      const updatedSession = await prisma.discoverySession.findUnique({
        where: { id: sessionId },
        include: {
          conversationHistory: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      return updatedSession as DiscoverySession;
    } catch (error) {
      console.error('[AI Discovery] Error adding user message:', error);
      throw error;
    }
  }

  /**
   * Generate automatic customer insights when product vertical is selected
   */
  static async generateCustomerInsights(industry: string, productVertical: string): Promise<{
    content: string;
    metadata?: any;
  }> {
    try {
      // Get customer types from database for this product vertical
      const vertical = await prisma.productVertical.findFirst({
        where: { 
          name: productVertical,
          industry: { name: industry }
        },
        include: {
          customerTypes: {
            where: { isActive: true }
          }
        }
      });

      if (!vertical) {
        throw new Error(`Product vertical '${productVertical}' not found for industry '${industry}'`);
      }

      // Build Claude prompt for self-prompting analysis
      const prompt = this.buildSelfPromptingAnalysisPrompt(industry, productVertical, vertical.customerTypes);
      
      // Call Claude API for self-prompting analysis
      const claudeResponse = await callClaudeAPI(prompt);
      
      // Parse Claude's response
      const content = claudeResponse.content[0]?.text || this.getFallbackCustomerInsights(industry, productVertical, vertical.customerTypes);
      
      return {
        content: content,
        metadata: {
          industry: industry,
          productVertical: productVertical,
          customerTypes: vertical.customerTypes.map(ct => ({
            id: ct.id,
            name: ct.name,
            description: ct.description,
            estimatedValue: ct.estimatedValue
          }))
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
  private static buildSelfPromptingAnalysisPrompt(industry: string, productVertical: string, customerTypes: CustomerType[]): string {
    const customerTypeInfo = customerTypes.map(ct => 
      `- ${ct.name}: ${ct.description} (${ct.marketSegment}, ${ct.estimatedValue})`
    ).join('\n');

    return `You are an expert AI analyst specializing in B2B customer discovery and market research.

I need you to analyze ${productVertical} in the ${industry} industry, but instead of just providing information, I want you to:

1. **Ask yourself key questions** about the customer landscape
2. **Analyze the answers** to those questions
3. **Generate insights** based on your analysis
4. **Present your findings** in a conversational, analytical way

IMPORTANT: Focus on B2B customers (businesses that would buy this product), NOT end consumers.

Here are the customer types we've identified for ${productVertical}:
${customerTypeInfo}

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
  private static getFallbackCustomerInsights(industry: string, productVertical: string, customerTypes?: CustomerType[]): string {
    if (customerTypes && customerTypes.length > 0) {
      const customerTypeInfo = customerTypes.map(ct => 
        `**${ct.name}** (${ct.marketSegment}): ${ct.description}\n- Characteristics: ${ct.characteristics.join(', ')}\n- Buying Behavior: ${ct.buyingBehavior}\n- Estimated Value: ${ct.estimatedValue}`
      ).join('\n\n');

      return `For ${productVertical} in the ${industry} industry, your primary B2B customers include:

${customerTypeInfo}

**Market Opportunities:**
- Growing demand for ${productVertical} solutions
- Increasing adoption in ${industry} sector
- Strong growth potential in identified customer segments

**Next Steps:**
1. Focus on the highest-value customer types first
2. Develop targeted messaging for each segment
3. Consider geographic and size-based targeting strategies`;
    }

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

    const industryInsights = insights[industry.toLowerCase().replace(/\s+/g, '_') as keyof typeof insights];
    const verticalInsights = industryInsights?.[productVertical.toLowerCase().replace(/\s+/g, '_') as keyof typeof industryInsights];
    
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
    const context = industry && productVertical 
      ? `You are helping with customer discovery for ${productVertical} in the ${industry} industry. `
      : 'You are an expert AI assistant helping with customer discovery and market analysis. ';

    return `${context}

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
      
      console.log(`[AI Discovery] Found ${results.length} customers using Claude AI`);
      
      return results;
      
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
    
    return `You are an expert in customer discovery and market research. 

I need you to find potential customers for ${productVertical} in the ${industry} industry.

Requirements:
- Industry: ${industry}
- Product Vertical: ${productVertical}
- Customer Types: ${customerTypes.join(', ') || 'All relevant types'}
- Geography: ${geography}
- Max Results: ${maxResults}

Please provide a list of potential customers in this JSON format:
[
  {
    "url": "company website or LinkedIn",
    "title": "Company Name",
    "description": "Brief description of the company and why they would be interested in this product",
    "relevanceScore": 0.85,
    "location": "City, State",
    "companyType": "Type of business"
  }
]

Focus on:
1. Companies that would actually need ${productVertical}
2. Real companies with online presence
3. High-value prospects with purchasing power
4. Companies in the specified geography
5. Relevance scores based on how well they match the criteria

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
    
    if (industry === 'Dental' && productVertical === 'CBCT Systems') {
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
    } else if (industry === 'Dental' && productVertical === 'Dental Lasers') {
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

  /**
   * AI-Driven Industry Discovery: Use configured AI engines to discover industries
   */
  static async discoverIndustries(
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
      console.log(`[AI Discovery] Starting AI-driven industry discovery for: "${userInput}" with criteria:`, constraints);
      
      // Get the best available AI service for industry discovery
      const serviceConfigService = new ServiceConfigurationService();
      console.log('[AI Discovery] ServiceConfigurationService created, selecting AI_DISCOVERY service...');
      
      // Debug: List all available operations and services
      try {
        const allServices = await serviceConfigService.getAllServiceProviders();
        console.log('[AI Discovery] All available services:', allServices.map((s: any) => ({ id: s.id, name: s.name, type: s.type, isActive: s.isActive })));
        
        // Try to get operations from the operation service mappings
        const operationMappings = await prisma.operationServiceMapping.findMany({
          where: { isEnabled: true },
          include: { service: true }
        });
        console.log('[AI Discovery] All available operation mappings:', operationMappings.map((m: any) => ({ 
          operation: m.operation, 
          serviceName: m.service.name, 
          isEnabled: m.isEnabled 
        })));
      } catch (debugError: any) {
        console.log('[AI Discovery] Debug info not available:', debugError.message);
      }
      
      // Try different operation names that might be configured
      let aiService = await serviceConfigService.selectService('AI_DISCOVERY');
      if (!aiService) {
        console.log('[AI Discovery] AI_DISCOVERY not found, trying MARKET_DISCOVERY...');
        aiService = await serviceConfigService.selectService('MARKET_DISCOVERY');
      }
      if (!aiService) {
        console.log('[AI Discovery] MARKET_DISCOVERY not found, trying AI_ENGINE...');
        aiService = await serviceConfigService.selectService('AI_ENGINE');
      }
      
      // Fallback: try to get any available AI service
      if (!aiService) {
        console.log('[AI Discovery] No specific operations found, trying to get any AI service...');
        const allServices = await serviceConfigService.getAllServiceProviders();
        const aiServices = allServices.filter((s: any) => 
          s.isActive && (s.type === 'AI_ENGINE' || s.name.toLowerCase().includes('claude') || s.name.toLowerCase().includes('gpt'))
        );
        if (aiServices.length > 0) {
          aiService = aiServices[0];
          console.log('[AI Discovery] Using fallback AI service:', aiService.name);
        }
      }
      
      console.log('[AI Discovery] AI service selection result:', aiService);
      
      if (!aiService) {
        console.error('[AI Discovery] No AI service available for any discovery operation');
        throw new Error('No AI service available for industry discovery');
      }

      console.log('[AI Discovery] Using AI service:', aiService.name, 'Type:', aiService.type);

      // Build AI prompt for industry discovery with criteria
      const prompt = this.buildIndustryDiscoveryPrompt(userInput, constraints);
      console.log('[AI Discovery] Built prompt length:', prompt.length);
      console.log('[AI Discovery] Prompt preview:', prompt.substring(0, 200) + '...');
      
      // Call the configured AI service
      let aiResponse;
      console.log('[AI Discovery] About to call AI service:', aiService.name);
      
      if (aiService.name.includes('Claude')) {
        console.log('[AI Discovery] Calling Claude API directly...');
        aiResponse = await callClaudeAPI(prompt);
        console.log('[AI Discovery] Claude API call completed successfully');
      } else if (aiService.type === 'AI_ENGINE') {
        // For other AI engines, try to use their specific APIs
        // For now, fallback to Claude
        console.log('[AI Discovery] AI_ENGINE type detected, falling back to Claude...');
        aiResponse = await callClaudeAPI(prompt);
        console.log('[AI Discovery] Claude API fallback call completed successfully');
      } else {
        // Fallback to Claude
        console.log('[AI Discovery] Using Claude as final fallback...');
        aiResponse = await callClaudeAPI(prompt);
        console.log('[AI Discovery] Claude API final fallback call completed successfully');
      }

      // Parse AI response into structured industry data
      const discoveredIndustries = this.parseIndustryDiscoveryResponse(aiResponse, userInput);
      
      // Apply criteria filtering and generate smart suggestions
      const filteredResults = this.applyCriteriaFiltering(discoveredIndustries, constraints);
      
      // Generate smart suggestions if results are limited
      const suggestions = this.generateSmartSuggestions(userInput, filteredResults, constraints);
      
      console.log(`[AI Discovery] Discovered ${filteredResults.length} industries using ${aiService.name}`);
      
      return {
        industries: filteredResults,
        totalFound: filteredResults.length,
        aiEngineUsed: aiService.name,
        suggestions
      };

    } catch (error) {
      console.error('[AI Discovery] === AI DISCOVERY FAILED ===');
      console.error('[AI Discovery] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace'
      });
      
      // Enhanced error handling with user-friendly messages
      const errorDetails = this.analyzeClaudeError(error);
      console.error('[AI Discovery] Error analysis:', errorDetails);
      
      // Fallback to intelligent industry suggestions based on user input
      const fallbackResult = this.getFallbackIndustrySuggestions(userInput, constraints, errorDetails);
      console.log('[AI Discovery] Fallback result generated:', {
        industriesCount: fallbackResult.industries.length,
        aiEngineUsed: fallbackResult.aiEngineUsed,
        hasConfigurationError: !!fallbackResult.configurationError
      });
      console.log('[AI Discovery] === FALLBACK COMPLETE ===');
      return fallbackResult;
    }
  }

  /**
   * Apply criteria filtering to discovered industries
   */
  private static applyCriteriaFiltering(
    industries: any[], 
    constraints?: any
  ): any[] {
    if (!constraints) return industries;
    
    let filtered = industries;
    
    // Filter by market size
    if (constraints.marketSize) {
      const minSize = this.parseMarketSize(constraints.marketSize);
      filtered = filtered.filter(industry => {
        const industrySize = this.parseMarketSize(industry.marketSize);
        return industrySize >= minSize;
      });
    }
    
    // Filter by growth rate
    if (constraints.growthRate) {
      const minGrowth = parseFloat(constraints.growthRate);
      filtered = filtered.filter(industry => {
        const growth = parseFloat(industry.growthRate.replace(/[^\d.]/g, ''));
        return growth >= minGrowth;
      });
    }
    
    // Filter by industry type
    if (constraints.industryType) {
      filtered = filtered.filter(industry => {
        const type = constraints.industryType.toLowerCase();
        const industryName = industry.name.toLowerCase();
        const description = industry.description.toLowerCase();
        
        switch (type) {
          case 'b2b':
            return !industryName.includes('consumer') && !description.includes('consumer');
          case 'software':
            return industryName.includes('software') || industryName.includes('tech') || 
                   description.includes('software') || description.includes('technology');
          case 'manufacturing':
            return industryName.includes('manufacturing') || industryName.includes('industrial') ||
                   description.includes('manufacturing') || description.includes('industrial');
          case 'healthcare':
            return industryName.includes('health') || industryName.includes('medical') ||
                   description.includes('health') || description.includes('medical');
          case 'financial':
            return industryName.includes('financial') || industryName.includes('banking') ||
                   description.includes('financial') || description.includes('banking');
          default:
            return true;
        }
      });
    }
    
    // Filter by geography
    if (constraints.geography) {
      filtered = filtered.filter(industry => {
        const geo = constraints.geography.toLowerCase();
        const description = industry.description.toLowerCase();
        
        switch (geo) {
          case 'us':
            return description.includes('us') || description.includes('united states') || 
                   description.includes('american') || description.includes('domestic');
          case 'northamerica':
            return description.includes('north america') || description.includes('canada') ||
                   description.includes('mexico') || description.includes('us');
          case 'europe':
            return description.includes('europe') || description.includes('european') ||
                   description.includes('uk') || description.includes('germany');
          case 'asia':
            return description.includes('asia') || description.includes('asian') ||
                   description.includes('china') || description.includes('japan');
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }

  /**
   * Generate smart suggestions when criteria are too restrictive
   */
  private static generateSmartSuggestions(
    userInput: string,
    filteredResults: any[], 
    constraints?: any
  ): any {
    const suggestions: any = {};
    
    // If results are limited, suggest adjacent industries
    if (filteredResults.length <= 2) {
      suggestions.adjacentIndustries = this.getAdjacentIndustries(userInput, constraints);
      suggestions.alternativeCriteria = this.getAlternativeCriteria(constraints);
      suggestions.marketInsights = this.getMarketInsights(userInput, constraints);
    }
    
    return suggestions;
  }

  /**
   * Get adjacent industries when criteria are too restrictive
   */
  private static getAdjacentIndustries(userInput: string, constraints?: any): string[] {
    const input = userInput.toLowerCase();
    const adjacent: string[] = [];
    
    if (input.includes('healthcare') || input.includes('medical')) {
      adjacent.push('Pharmaceuticals', 'Medical Devices', 'Digital Health', 'Healthcare IT', 'Biotechnology');
    }
    
    if (input.includes('software') || input.includes('tech')) {
      adjacent.push('Cloud Computing', 'Cybersecurity', 'Data Analytics', 'AI/ML', 'SaaS');
    }
    
    if (input.includes('manufacturing') || input.includes('industrial')) {
      adjacent.push('Automation', 'Robotics', 'Supply Chain', 'Logistics', 'Quality Control');
    }
    
    if (input.includes('financial') || input.includes('banking')) {
      adjacent.push('Fintech', 'Insurance', 'Investment', 'Payment Processing', 'RegTech');
    }
    
    return adjacent;
  }

  /**
   * Get alternative criteria suggestions
   */
  private static getAlternativeCriteria(constraints?: any): string[] {
    const alternatives: string[] = [];
    
    if (constraints?.marketSize && constraints.marketSize !== '1B') {
      alternatives.push(`Try smaller market size (e.g., $1B+ instead of $${constraints.marketSize}+)`);
    }
    
    if (constraints?.growthRate && constraints.growthRate !== '5') {
      alternatives.push(`Consider lower growth rates (e.g., 5%+ instead of ${constraints.growthRate}%+)`);
    }
    
    if (constraints?.industryType && constraints.industryType !== 'B2B') {
      alternatives.push(`Expand industry type to include more categories`);
    }
    
    if (constraints?.geography && constraints.geography !== 'Global') {
      alternatives.push(`Consider global markets for more opportunities`);
    }
    
    return alternatives;
  }

  /**
   * Get market insights and trends
   */
  private static getMarketInsights(userInput: string, constraints?: any): string {
    const input = userInput.toLowerCase();
    
    if (input.includes('healthcare')) {
      return "Healthcare markets are experiencing rapid digital transformation. Consider adjacent areas like telemedicine, health analytics, or patient engagement platforms.";
    }
    
    if (input.includes('software')) {
      return "Software markets are highly competitive but growing rapidly. Focus on specialized niches or emerging technologies like AI, blockchain, or edge computing.";
    }
    
    if (input.includes('manufacturing')) {
      return "Manufacturing is undergoing Industry 4.0 transformation. Look into IoT, predictive maintenance, or sustainable manufacturing solutions.";
    }
    
    return "Consider expanding your search criteria or exploring adjacent market segments for more opportunities.";
  }

  /**
   * Parse market size strings to numeric values for comparison
   */
  private static parseMarketSize(sizeStr: string): number {
    const size = sizeStr.toLowerCase();
    if (size.includes('t')) {
      return parseFloat(size.replace(/[^\d.]/g, '')) * 1000;
    } else if (size.includes('b')) {
      return parseFloat(size.replace(/[^\d.]/g, ''));
    } else if (size.includes('m')) {
      return parseFloat(size.replace(/[^\d.]/g, '')) / 1000;
    }
    return 0;
  }

  /**
   * Build AI prompt for industry discovery
   */
  private static buildIndustryDiscoveryPrompt(
    userInput: string, 
    constraints?: any
  ): string {
    const maxIndustries = constraints?.maxIndustries || 8;
    const focusAreas = constraints?.focusAreas?.join(', ') || 'all areas';
    
    return `You are an expert AI analyst specializing in industry discovery and market research.

A user wants to discover industries for: "${userInput}"

Please analyze this input and suggest ${maxIndustries} relevant industries that would be good opportunities.

Requirements:
- Focus on B2B industries where the user could sell products/services
- Consider market size, growth potential, and relevance to the user's input
- Provide specific, actionable industry suggestions
- Include both established and emerging industries

Please respond in this exact JSON format:
[
  {
    "name": "Industry Name",
    "description": "Brief description of the industry and why it's relevant",
    "marketSize": "Estimated market size (e.g., $50B, $2.3T)",
    "growthRate": "Annual growth rate (e.g., 8%, 15% annually)",
    "relevanceScore": 0.95,
    "reasoning": "Why this industry is a good fit for the user's needs",
    "suggestedVerticals": ["Product Category 1", "Product Category 2", "Product Category 3"]
  }
]

Focus on industries that:
1. Match the user's described needs
2. Have strong growth potential
3. Are accessible for B2B sales
4. Have clear product/service opportunities

Make sure the JSON is valid and properly formatted.`;
  }

  /**
   * Parse AI response into structured industry data
   */
  private static parseIndustryDiscoveryResponse(aiResponse: any, userInput: string): any[] {
    try {
      const content = aiResponse.content?.[0]?.text || aiResponse.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Extract JSON from AI response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }

      const industries = JSON.parse(jsonMatch[0]);
      
      // Validate and format results
      return industries.map((industry: any, index: number) => ({
        id: `ai_discovered_${Date.now()}_${index}`,
        name: industry.name || `Industry ${index + 1}`,
        description: industry.description || 'Industry description',
        marketSize: industry.marketSize || '$10B+',
        growthRate: industry.growthRate || '5% annually',
        relevanceScore: industry.relevanceScore || 0.8,
        reasoning: industry.reasoning || 'AI analysis suggests this industry is relevant',
        suggestedVerticals: industry.suggestedVerticals || ['Product Category 1', 'Product Category 2']
      }));

    } catch (error) {
      console.error('[AI Discovery] Error parsing AI industry response:', error);
      throw error;
    }
  }

  /**
   * Analyze Claude API errors and provide user-friendly error details
   */
  private static analyzeClaudeError(error: any): any {
    const errorMessage = error.message || '';
    
    // Check for specific Claude API errors
    if (errorMessage.includes('404 Not Found') && errorMessage.includes('model:')) {
      const modelMatch = errorMessage.match(/model: ([^\s]+)/);
      const failedModel = modelMatch ? modelMatch[1] : 'unknown';
      
      return {
        type: 'MODEL_NOT_FOUND',
        severity: 'HIGH',
        userMessage: `The Claude model '${failedModel}' is not available or has been discontinued.`,
        technicalDetails: `Model ${failedModel} returned 404 Not Found from Claude API`,
        suggestedActions: [
          'Update your Claude model configuration to a current model name',
          'Use claude-3-sonnet-20240229 or claude-3-haiku-20240307'
        ],
        currentModel: failedModel,
        recommendedModels: [
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
          'claude-3-opus-20240229'
        ]
      };
    }
    
    if (errorMessage.includes('401 Unauthorized')) {
      return {
        type: 'API_KEY_INVALID',
        severity: 'HIGH',
        userMessage: 'Your Claude API key is invalid or has expired.',
        technicalDetails: 'Claude API returned 401 Unauthorized',
        suggestedActions: [
          'Check your Claude API key in the system configuration',
          'Verify the key is active in your Anthropic account',
          'Update the API key if it has expired'
        ]
      };
    }
    
    if (errorMessage.includes('429 Too Many Requests')) {
      return {
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        userMessage: 'You have exceeded your Claude API rate limits.',
        technicalDetails: 'Claude API returned 429 Too Many Requests',
        suggestedActions: [
          'Wait a few minutes before trying again',
          'Check your Anthropic account usage limits',
          'Consider upgrading your API plan if this happens frequently'
        ]
      };
    }
    
    // Generic error
    return {
      type: 'UNKNOWN_ERROR',
      severity: 'MEDIUM',
      userMessage: 'There was an issue connecting to Claude AI.',
      technicalDetails: errorMessage,
      suggestedActions: [
        'Check your internet connection',
        'Verify Claude API service status',
        'Contact support if the problem persists'
      ]
    };
  }

  /**
   * Fallback industry suggestions when AI fails
   */
  private static getFallbackIndustrySuggestions(
    userInput: string, 
    constraints?: any,
    errorDetails?: any
  ): any {
    console.log('[Fallback] === GENERATING FALLBACK SUGGESTIONS ===');
    console.log('[Fallback] User input:', userInput);
    console.log('[Fallback] Constraints:', constraints);
    
    // Analyze user input for keywords and suggest relevant industries
    const input = userInput.toLowerCase();
    const suggestions = [];

    if (input.includes('healthcare') || input.includes('medical') || input.includes('health')) {
      suggestions.push({
        id: 'fallback_healthcare',
        name: 'Healthcare Technology',
        description: 'Digital health solutions, medical devices, and healthcare IT',
        marketSize: '$350B+',
        growthRate: '12% annually',
        relevanceScore: 0.95,
        reasoning: 'Directly matches healthcare focus in user input',
        suggestedVerticals: ['Digital Health Platforms', 'Medical Devices', 'Healthcare IT']
      });
    }

    if (input.includes('software') || input.includes('tech') || input.includes('digital')) {
      suggestions.push({
        id: 'fallback_software',
        name: 'Enterprise Software',
        description: 'B2B software solutions for businesses',
        marketSize: '$200B+',
        growthRate: '15% annually',
        relevanceScore: 0.9,
        reasoning: 'Software focus in user input suggests enterprise software opportunities',
        suggestedVerticals: ['CRM Systems', 'ERP Solutions', 'Business Intelligence']
      });
    }

    if (input.includes('manufacturing') || input.includes('industrial') || input.includes('factory')) {
      suggestions.push({
        id: 'fallback_manufacturing',
        name: 'Industrial Manufacturing',
        description: 'Manufacturing equipment, automation, and industrial solutions',
        marketSize: '$150B+',
        growthRate: '8% annually',
        relevanceScore: 0.85,
        reasoning: 'Manufacturing focus in user input',
        suggestedVerticals: ['Industrial Automation', 'Manufacturing Equipment', 'Quality Control']
      });
    }

    // Add more intelligent suggestions based on input analysis
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'fallback_general',
        name: 'Business Services',
        description: 'General B2B services and solutions',
        marketSize: '$100B+',
        growthRate: '6% annually',
        relevanceScore: 0.7,
        reasoning: 'General business focus in user input',
        suggestedVerticals: ['Consulting Services', 'Business Solutions', 'Professional Services']
      });
    }

    const result = {
      industries: suggestions,
      totalFound: suggestions.length,
      aiEngineUsed: 'Fallback Analysis',
      configurationError: errorDetails,
      fallbackReason: errorDetails ? errorDetails.userMessage : 'AI service temporarily unavailable'
    };
    
    console.log('[Fallback] Generated suggestions:', suggestions.map(s => s.name));
    console.log('[Fallback] === FALLBACK SUGGESTIONS COMPLETE ===');
    return result;
  }
} 