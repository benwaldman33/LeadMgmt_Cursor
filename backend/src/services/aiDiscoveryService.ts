import { prisma } from '../index';
import { AIScoringService } from './aiScoringService';
import { ServiceConfigurationService } from './serviceConfigurationService';
import APIKeyService from './apiKeyService';

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
      valueLength: config.value.length,
      valueStartsWith: config.value.substring(0, 20) + '...'
    });
    
    if (config.isEncrypted) {
      const decrypted = decryptValue(config.value);
      console.log(`[Config] Decrypted value for ${key}:`, {
        length: decrypted.length,
        startsWith: decrypted.substring(0, 20) + '...'
      });
      return decrypted;
    } else {
      console.log(`[Config] Config ${key} is not encrypted, returning as-is`);
      return config.value;
    }
  } catch (error) {
    console.error(`[Config] Error getting decrypted config for ${key}:`, error);
    return null;
  }
}

// Dynamic AI Engine API call function
async function callAIEngine(prompt: string, operation: string = 'AI_DISCOVERY'): Promise<any> {
  console.log(`\n[AI Discovery] === DYNAMIC AI ENGINE CALL START ===`);
  console.log(`[AI Discovery] Operation: ${operation}`);
  console.log(`[AI Discovery] Prompt length: ${prompt.length} characters`);
  
  const serviceConfigService = new ServiceConfigurationService();
  
  try {
    // Get available AI engines for this operation
    console.log(`[AI Discovery] Fetching available services for operation: ${operation}`);
    const availableServices = await serviceConfigService.getAvailableServices(operation);
    console.log(`[AI Discovery] Total available services: ${availableServices.length}`);
    
    const aiEngines = availableServices.filter(service => service.type === 'AI_ENGINE');
    console.log(`[AI Discovery] AI engines found: ${aiEngines.length}`);
    
    // Log each service found
    availableServices.forEach((service, index) => {
      console.log(`[AI Discovery] Service ${index + 1}: ${service.name} (Type: ${service.type}, Priority: ${service.priority}, Active: ${service.isActive})`);
    });
    
    if (aiEngines.length === 0) {
      console.error(`[AI Discovery] No AI engines available for operation: ${operation}`);
      console.log(`[AI Discovery] Available service types:`, availableServices.map(s => s.type));
      throw new Error(`No AI engines available for operation: ${operation}`);
    }
    
    // Sort by priority (lower number = higher priority)
    console.log(`[AI Discovery] Sorting engines by priority...`);
    aiEngines.sort((a, b) => a.priority - b.priority);
    
    console.log(`[AI Discovery] Engine priority order:`);
    aiEngines.forEach((engine, index) => {
      console.log(`[AI Discovery] ${index + 1}. ${engine.name} (Priority: ${engine.priority})`);
    });
    
    // Try each AI engine in priority order
    for (let i = 0; i < aiEngines.length; i++) {
      const engine = aiEngines[i];
      console.log(`\n[AI Discovery] === ATTEMPTING ENGINE ${i + 1}/${aiEngines.length} ===`);
      console.log(`[AI Discovery] Engine: ${engine.name}`);
      console.log(`[AI Discovery] Priority: ${engine.priority}`);
      console.log(`[AI Discovery] Type: ${engine.type}`);
      console.log(`[AI Discovery] Active: ${engine.isActive}`);
      
      try {
        console.log(`[AI Discovery] Calling ${engine.name}...`);
        const result = await callSpecificAIEngine(engine, prompt);
        console.log(`[AI Discovery] === AI ENGINE CALL SUCCESS (${engine.name}) ===`);
        console.log(`[AI Discovery] Engine used: ${engine.name}`);
        console.log(`[AI Discovery] Priority: ${engine.priority}`);
        return {
          ...result,
          engineUsed: engine.name,
          priority: engine.priority
        };
      } catch (error: any) {
        console.error(`[AI Discovery] AI engine ${engine.name} failed:`);
        console.error(`[AI Discovery] Error type: ${error.constructor.name}`);
        console.error(`[AI Discovery] Error message: ${error.message}`);
        console.error(`[AI Discovery] Error stack: ${error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace'}`);
        
        // If this is the last engine, throw the error
        if (i === aiEngines.length - 1) {
          console.error(`[AI Discovery] All ${aiEngines.length} AI engines failed. Throwing final error.`);
          throw new Error(`All AI engines failed. Last error: ${error.message}`);
        }
        
        // Otherwise, continue to the next engine
        console.log(`[AI Discovery] Continuing to next AI engine...`);
      }
    }
    
    throw new Error('No AI engines available');
    
  } catch (error) {
    console.error('[AI Discovery] === DYNAMIC AI ENGINE CALL FAILED ===');
    console.error('[AI Discovery] Final error:', error);
    console.error('[AI Discovery] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 5).join('\n') : 'No stack trace'
    });
    throw error;
  }
}

// Call a specific AI engine based on its configuration
async function callSpecificAIEngine(engine: any, prompt: string): Promise<any> {
  console.log(`[AI Discovery] === CALLING SPECIFIC ENGINE: ${engine.name} ===`);
  
  try {
    const config = JSON.parse(engine.config);
    const capabilities = JSON.parse(engine.capabilities);
    
    console.log(`[AI Discovery] Engine config parsed successfully`);
    console.log(`[AI Discovery] Config details:`, {
      hasApiKey: !!config.apiKey,
      apiKeyLength: config.apiKey?.length || 0,
      apiKeyStartsWith: config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'none',
      model: config.model,
      endpoint: config.endpoint,
      maxTokens: config.maxTokens,
      capabilities: capabilities
    });
    
    // Determine which API to call based on the engine name/type
    const engineName = engine.name.toLowerCase();
    console.log(`[AI Discovery] Engine name (lowercase): ${engineName}`);
    
    let result;
    if (engineName.includes('claude') || engineName.includes('anthropic')) {
      console.log(`[AI Discovery] Routing to Claude API`);
      result = await callClaudeAPI(config, prompt);
    } else if (engineName.includes('openai') || engineName.includes('gpt')) {
      console.log(`[AI Discovery] Routing to OpenAI API`);
      result = await callOpenAIAPI(config, prompt);
    } else if (engineName.includes('grok')) {
      console.log(`[AI Discovery] Routing to Grok API`);
      result = await callGrokAPI(config, prompt);
    } else {
      console.log(`[AI Discovery] Unknown engine type, defaulting to Claude API`);
      result = await callClaudeAPI(config, prompt);
    }
    
    console.log(`[AI Discovery] === ENGINE ${engine.name} CALL COMPLETED SUCCESSFULLY ===`);
    return result;
    
  } catch (error) {
    console.error(`[AI Discovery] === ENGINE ${engine.name} CONFIGURATION ERROR ===`);
    console.error(`[AI Discovery] Error parsing engine config:`, error);
    throw error;
  }
}

// Claude API call function
async function callClaudeAPI(config: any, prompt: string): Promise<any> {
  console.log('[AI Discovery] === CLAUDE API CALL START ===');
  
  const apiKey = config.apiKey;
  const model = config.model || 'claude-sonnet-4-20250514';
  const maxTokens = config.maxTokens || 4096;
  const endpoint = config.endpoint || 'https://api.anthropic.com/v1';
  
  console.log('[AI Discovery] Claude configuration:', { 
    model, 
    maxTokens, 
    endpoint,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyStartsWith: apiKey ? apiKey.substring(0, 10) + '...' : 'none'
  });

  // Validate API key
  if (!apiKey || apiKey === '[ENCRYPTED]' || apiKey === 'your-api-key') {
    console.error('[AI Discovery] Invalid API key detected');
    throw new Error('Invalid Claude API key - please check your configuration');
  }

  try {
    // Construct the full endpoint URL - if endpoint already includes /messages, use as-is, otherwise add it
    const fullEndpoint = endpoint.includes('/messages') ? endpoint : `${endpoint}/messages`;
    console.log(`[AI Discovery] Making Claude API request to: ${fullEndpoint}`);
    console.log(`[AI Discovery] Using model: ${model}`);
    console.log(`[AI Discovery] Max tokens: ${maxTokens}`);
    
    const requestBody = {
      model: model,
      max_tokens: parseInt(maxTokens),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    console.log(`[AI Discovery] Request body prepared, sending request...`);
    
    const response = await fetch(fullEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`[AI Discovery] Claude API response received`);
    console.log(`[AI Discovery] Status: ${response.status} ${response.statusText}`);
    console.log(`[AI Discovery] Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Discovery] Claude API error response:`, errorText);
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`[AI Discovery] Claude API response parsed successfully`);
    console.log(`[AI Discovery] Response type: ${typeof responseData}`);
    console.log(`[AI Discovery] Response keys:`, Object.keys(responseData));
    
    if (responseData.content && responseData.content.length > 0) {
      console.log(`[AI Discovery] Content length: ${responseData.content[0]?.text?.length || 0} characters`);
    }
    
    console.log(`[AI Discovery] === CLAUDE API CALL SUCCESS ===`);
    return responseData;
  } catch (error) {
    console.error('[AI Discovery] === CLAUDE API CALL FAILED ===');
    console.error('[AI Discovery] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace'
    });
    throw error;
  }
}

// OpenAI API call function
async function callOpenAIAPI(config: any, prompt: string): Promise<any> {
  console.log('[AI Discovery] === OPENAI API CALL START ===');
  
  const apiKey = config.apiKey;
  const model = config.model || 'gpt-4';
  const maxTokens = config.maxTokens || 4096;
  const endpoint = config.endpoint || 'https://api.openai.com/v1';
  
  console.log('[AI Discovery] OpenAI configuration:', { 
    model, 
    maxTokens, 
    endpoint,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0
  });

  try {
    console.log(`[AI Discovery] Making OpenAI API request`);
    console.log(`[AI Discovery] API endpoint: ${endpoint}/chat/completions`);
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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

    console.log(`[AI Discovery] OpenAI API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Discovery] OpenAI API error response:`, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`[AI Discovery] OpenAI API response received, content length: ${JSON.stringify(responseData).length}`);
    return responseData;
  } catch (error) {
    console.error('[AI Discovery] OpenAI API request failed:', error);
    throw error;
  }
}

// Grok API call function
async function callGrokAPI(config: any, prompt: string): Promise<any> {
  console.log('[AI Discovery] === GROK API CALL START ===');
  
  const apiKey = config.apiKey;
  const model = config.model || 'grok-beta';
  const maxTokens = config.maxTokens || 4096;
  const endpoint = config.endpoint || 'https://api.x.ai/v1';
  
  console.log('[AI Discovery] Grok configuration:', { 
    model, 
    maxTokens, 
    endpoint,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0
  });

  try {
    console.log(`[AI Discovery] Making Grok API request`);
    console.log(`[AI Discovery] API endpoint: ${endpoint}/chat/completions`);
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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

    console.log(`[AI Discovery] Grok API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Discovery] Grok API error response:`, errorText);
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`[AI Discovery] Grok API response received, content length: ${JSON.stringify(responseData).length}`);
    return responseData;
  } catch (error) {
    console.error('[AI Discovery] Grok API request failed:', error);
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
   * Save discovered industries to database
   */
  private static async saveDiscoveredIndustries(industries: Array<{
    id: string;
    name: string;
    description: string;
    marketSize: string;
    growthRate: string;
    relevanceScore: number;
    reasoning: string;
    suggestedVerticals: string[];
  }>): Promise<Array<{
    id: string;
    name: string;
    description: string;
    marketSize: string;
    growthRate: string;
    relevanceScore: number;
    reasoning: string;
    suggestedVerticals: string[];
  }>> {
    console.log('[AI Discovery] Saving discovered industries to database...');
    
    const savedIndustries = [];
    
    for (const industry of industries) {
      try {
        // Check if industry already exists by name
        let existingIndustry = await prisma.industry.findFirst({
          where: { name: industry.name }
        });
        
        if (existingIndustry) {
          console.log(`[AI Discovery] Industry "${industry.name}" already exists, using existing ID: ${existingIndustry.id}`);
          savedIndustries.push({
            ...industry,
            id: existingIndustry.id
          });
        } else {
          // Create new industry in database
          const newIndustry = await prisma.industry.create({
            data: {
              name: industry.name,
              description: industry.description,
              marketSize: industry.marketSize,
              growthRate: industry.growthRate
            }
          });
          
          console.log(`[AI Discovery] Created new industry "${industry.name}" with ID: ${newIndustry.id}`);
          savedIndustries.push({
            ...industry,
            id: newIndustry.id
          });
        }

        // Note: Product verticals will be created on-demand when user clicks on industry
        
      } catch (error) {
        console.error(`[AI Discovery] Error saving industry "${industry.name}":`, error);
        // Continue with other industries even if one fails
        savedIndustries.push(industry);
      }
    }
    
    console.log(`[AI Discovery] Successfully saved ${savedIndustries.length} industries to database`);
    console.log(`[AI Discovery] Final saved industries with IDs:`, savedIndustries.map(s => ({ id: s.id, name: s.name })));
    return savedIndustries;
  }

  /**
   * Generate product verticals for an industry using AI
   */
  private static async generateProductVerticalsForIndustry(industryName: string): Promise<string[]> {
    console.log(`[AI Discovery] Generating product verticals for industry "${industryName}" using AI...`);
    
    try {
      const prompt = `You are an expert in market analysis and product categorization.

I need you to identify the most important product verticals (product categories) for the "${industryName}" industry.

Please provide 5-8 specific product verticals that represent the main product categories or service areas within this industry.

Requirements:
- Focus on B2B products/services that companies would buy
- Be specific and actionable (e.g., "Industrial Automation Systems" not just "Automation")
- Consider both established and emerging product categories
- Focus on high-value, high-growth areas
- Each vertical should be a distinct product/service category

Please respond with a JSON array of strings, like this:
["Product Vertical 1", "Product Vertical 2", "Product Vertical 3"]

Example for "Manufacturing":
["Industrial Automation Systems", "Quality Control Equipment", "CNC Machinery", "Safety Equipment", "Manufacturing Software", "Material Handling Systems"]

For the "${industryName}" industry, what are the key product verticals?`;

      const aiResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
      const content = aiResponse.content?.[0]?.text || aiResponse.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Extract JSON array from AI response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }

      const verticals = JSON.parse(jsonMatch[0]);
      
      // Validate and clean the verticals
      const cleanedVerticals = verticals
        .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
        .map((v: string) => v.trim())
        .slice(0, 8); // Limit to 8 verticals

      console.log(`[AI Discovery] AI generated ${cleanedVerticals.length} product verticals for "${industryName}":`, cleanedVerticals);
      return cleanedVerticals;

    } catch (error) {
      console.error(`[AI Discovery] Error generating product verticals for "${industryName}":`, error);
      
      // Fallback to generic verticals based on industry type
      const fallbackVerticals = this.getFallbackProductVerticals(industryName);
      console.log(`[AI Discovery] Using fallback verticals for "${industryName}":`, fallbackVerticals);
      return fallbackVerticals;
    }
  }

  /**
   * Get fallback product verticals when AI generation fails
   */
  private static getFallbackProductVerticals(industryName: string): string[] {
    const industry = industryName.toLowerCase();
    
    if (industry.includes('healthcare') || industry.includes('medical')) {
      return ['Medical Devices', 'Healthcare IT', 'Diagnostic Equipment', 'Patient Monitoring Systems', 'Surgical Equipment'];
    }
    
    if (industry.includes('manufacturing') || industry.includes('industrial')) {
      return ['Industrial Automation', 'Quality Control Equipment', 'Manufacturing Software', 'Safety Equipment', 'Material Handling'];
    }
    
    if (industry.includes('software') || industry.includes('tech')) {
      return ['Enterprise Software', 'Cloud Solutions', 'Data Analytics', 'Cybersecurity', 'Business Intelligence'];
    }
    
    if (industry.includes('financial') || industry.includes('banking')) {
      return ['Financial Software', 'Payment Processing', 'Risk Management', 'Compliance Solutions', 'Trading Systems'];
    }
    
    if (industry.includes('construction')) {
      return ['Construction Equipment', 'Building Materials', 'Project Management Software', 'Safety Equipment', 'HVAC Systems'];
    }
    
    if (industry.includes('food') || industry.includes('beverage')) {
      return ['Food Processing Equipment', 'Beverage Manufacturing', 'Packaging Solutions', 'Quality Control Systems', 'Supply Chain Software'];
    }
    
    // Generic fallback
    return ['Business Solutions', 'Professional Services', 'Technology Systems', 'Operational Equipment', 'Management Software'];
  }

  /**
   * Create product verticals for an industry based on AI suggestions
   */
  private static async createProductVerticalsForIndustry(industryId: string, suggestedVerticals: string[], industryName: string): Promise<void> {
    console.log(`[AI Discovery] Creating product verticals for industry "${industryName}"...`);
    
    if (!suggestedVerticals || suggestedVerticals.length === 0) {
      console.log(`[AI Discovery] No suggested verticals for industry "${industryName}"`);
      return;
    }

    for (const verticalName of suggestedVerticals) {
      try {
        // Check if vertical already exists for this industry
        const existingVertical = await prisma.productVertical.findFirst({
          where: { 
            name: verticalName,
            industryId: industryId
          }
        });

        if (existingVertical) {
          console.log(`[AI Discovery] Product vertical "${verticalName}" already exists for industry "${industryName}"`);
          continue;
        }

        // Create new product vertical
        const newVertical = await prisma.productVertical.create({
          data: {
            name: verticalName,
            description: `${verticalName} solutions and services for the ${industryName} industry`,
            marketSize: '$10M+',
            growthRate: '8% annually',
            industryId: industryId
          }
        });

        console.log(`[AI Discovery] Created product vertical "${verticalName}" for industry "${industryName}" with ID: ${newVertical.id}`);

        // Create some default customer types for this vertical
        await this.createDefaultCustomerTypes(newVertical.id, verticalName, industryName);

      } catch (error) {
        console.error(`[AI Discovery] Error creating product vertical "${verticalName}" for industry "${industryName}":`, error);
        // Continue with other verticals even if one fails
      }
    }
  }

  /**
   * Create default customer types for a product vertical
   */
  private static async createDefaultCustomerTypes(verticalId: string, verticalName: string, industryName: string): Promise<void> {
    const defaultCustomerTypes = [
      {
        name: 'Enterprise Customers',
        description: `Large ${industryName} companies requiring comprehensive ${verticalName} solutions`,
        characteristics: ['500+ employees', 'High budget', 'Long sales cycles'],
        buyingBehavior: 'Strategic partnerships, RFPs, multiple stakeholders',
        marketSegment: 'Enterprise',
        estimatedValue: '$100K-$500K'
      },
      {
        name: 'Mid-Market Customers',
        description: `Medium-sized ${industryName} businesses seeking ${verticalName} solutions`,
        characteristics: ['50-500 employees', 'Moderate budget', 'Growth-focused'],
        buyingBehavior: 'Direct sales, references, ROI-focused',
        marketSegment: 'Mid-Market',
        estimatedValue: '$25K-$100K'
      },
      {
        name: 'Small Business Customers',
        description: `Small ${industryName} companies needing ${verticalName} solutions`,
        characteristics: ['<50 employees', 'Budget-conscious', 'Quick decisions'],
        buyingBehavior: 'Online research, referrals, price-sensitive',
        marketSegment: 'SMB',
        estimatedValue: '$5K-$25K'
      }
    ];

    for (const customerType of defaultCustomerTypes) {
      try {
        const newCustomerType = await prisma.customerType.create({
          data: {
            ...customerType,
            productVerticalId: verticalId
          }
        });

        console.log(`[AI Discovery] Created customer type "${customerType.name}" for vertical "${verticalName}"`);
      } catch (error) {
        console.error(`[AI Discovery] Error creating customer type "${customerType.name}":`, error);
      }
    }
  }

  /**
   * Get product verticals for an industry from database
   * Creates them on-demand if they don't exist
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

      // Check if product verticals already exist for this industry
      let verticals = await prisma.productVertical.findMany({
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

      // If no verticals exist, create them on-demand using AI
      if (verticals.length === 0) {
        console.log(`[AI Discovery] No product verticals found for industry "${industry.name}", creating them on-demand...`);
        
        // Generate product verticals using AI
        const suggestedVerticals = await this.generateProductVerticalsForIndustry(industry.name);
        
        // Create the product verticals in the database
        await this.createProductVerticalsForIndustry(industryId, suggestedVerticals, industry.name);
        
        // Fetch the newly created verticals
        verticals = await prisma.productVertical.findMany({
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
        
        console.log(`[AI Discovery] Created ${verticals.length} product verticals for industry "${industry.name}"`);
      }

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
      const claudeResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
      
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
      const claudeResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
      
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
      
      const claudeResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
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
      const claudeResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
      
      // Parse Claude's response into structured results
      const results = this.parseClaudeCustomerResults(claudeResponse);
      
      console.log(`[AI Discovery] Found ${results.length} customers using Claude AI`);
      
      // If we got results, return them
      if (results.length > 0) {
        return results;
      }
      
      // If no results, try a broader search
      console.log('[AI Discovery] No specific results found, trying broader search...');
      const broaderPrompt = this.buildBroaderCustomerSearchPrompt(industry, productVertical, customerTypes, constraints);
      const broaderResponse = await callAIEngine(broaderPrompt, 'AI_DISCOVERY');
      const broaderResults = this.parseClaudeCustomerResults(broaderResponse);
      
      if (broaderResults.length > 0) {
        console.log(`[AI Discovery] Found ${broaderResults.length} customers using broader search`);
        return broaderResults;
      }
      
      // If still no results, try industry-specific search
      console.log('[AI Discovery] No broader results found, trying industry-specific search...');
      const industryPrompt = this.buildIndustrySpecificCustomerSearchPrompt(industry, productVertical, constraints);
      const industryResponse = await callAIEngine(industryPrompt, 'AI_DISCOVERY');
      const industryResults = this.parseClaudeCustomerResults(industryResponse);
      
      console.log(`[AI Discovery] Found ${industryResults.length} customers using industry-specific search`);
      return industryResults;
      
    } catch (error) {
      console.error('[AI Discovery] All AI search attempts failed:', error);
      
      // Instead of mock data, return an empty array with error information
      console.log('[AI Discovery] Returning empty results instead of mock data');
      return [];
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
    const maxResults = constraints?.maxResults || 50;
    const geography = constraints?.geography?.join(', ') || 'United States';
    
    return `You are an expert in customer discovery and market research.

Task: Find potential customers for ${productVertical} in the ${industry} industry.

Hard requirements (must follow exactly):
- Provide EXACTLY ${maxResults} companies. Not fewer, not more.
- Output MUST be a single, valid JSON array only (no prose before or after).
- Each item MUST strictly follow this schema:
  {
    "url": "https://...",                // Company website or LinkedIn
    "title": "Company Name",             // Company name
    "description": "Why they are a fit", // One sentence rationale
    "relevanceScore": 0.0-1.0,            // Float score
    "location": "City, State/Country",   // Location
    "companyType": "Type of business"     // e.g., Manufacturer, Distributor
  }

Context & filters:
- Industry: ${industry}
- Product Vertical: ${productVertical}
- Customer Types: ${customerTypes.join(', ') || 'All relevant types'}
- Geography: ${geography}

Quality rules:
1) Only REAL companies that actually exist (no fictional data)
2) Provide actual URLs that resolve for each company
3) Prioritize high-value prospects with purchasing power
4) Ensure companies match the specified geography
5) Calibrate relevanceScore based on how well they match the criteria

Return ONLY the JSON array with EXACTLY ${maxResults} objects.`;
  }

  /**
   * Build broader customer search prompt when specific search fails
   */
  private static buildBroaderCustomerSearchPrompt(
    industry: string,
    productVertical: string,
    customerTypes: string[],
    constraints?: {
      geography?: string[];
      maxResults?: number;
      companySize?: string[];
    }
  ): string {
    const maxResults = constraints?.maxResults || 50;
    const geography = constraints?.geography?.join(', ') || 'United States';
    
    return `You are an expert in customer discovery and market research. 

I need you to find potential customers for ${productVertical} in the ${industry} industry, but with a broader approach.

Requirements:
- Industry: ${industry}
- Product Vertical: ${productVertical}
- Customer Types: ${customerTypes.join(', ') || 'All relevant types'}
- Geography: ${geography}
- Max Results: ${maxResults}

Since the specific search didn't find results, please:
1. Think more broadly about companies that might need this type of solution
2. Consider companies in related industries or adjacent markets
3. Look for companies that might be expanding into this area
4. Include companies that could benefit from this technology even if not directly in the industry

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

Focus on real companies with online presence and purchasing power. Make sure the JSON is valid and properly formatted.`;
  }

  /**
   * Build industry-specific customer search prompt
   */
  private static buildIndustrySpecificCustomerSearchPrompt(
    industry: string,
    productVertical: string,
    constraints?: {
      geography?: string[];
      maxResults?: number;
      companySize?: string[];
    }
  ): string {
    const maxResults = constraints?.maxResults || 50;
    const geography = constraints?.geography?.join(', ') || 'United States';
    
    return `You are an expert in customer discovery and market research. 

I need you to find potential customers in the ${industry} industry, focusing on companies that could benefit from ${productVertical} solutions.

Requirements:
- Industry: ${industry}
- Product Vertical: ${productVertical}
- Geography: ${geography}
- Max Results: ${maxResults}

Please find companies in the ${industry} industry that:
1. Are actively growing or modernizing
2. Have technology adoption initiatives
3. Could benefit from ${productVertical} solutions
4. Have the budget and decision-making capability
5. Are located in the specified geography

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

Focus on real companies with online presence. Make sure the JSON is valid and properly formatted.`;
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
    
    // Dental industry mock data
    if (industry.toLowerCase().includes('dental') || industry.toLowerCase().includes('healthcare')) {
      if (productVertical.toLowerCase().includes('cbct') || productVertical.toLowerCase().includes('imaging')) {
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
      } else if (productVertical.toLowerCase().includes('laser')) {
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
      } else if (productVertical.toLowerCase().includes('software') || productVertical.toLowerCase().includes('management')) {
        mockResults = [
          {
            url: 'https://dental-practice-management.com',
            title: 'Dental Practice Management Solutions',
            description: 'Modern dental practice using comprehensive management software',
            relevanceScore: 0.93,
            location: 'Austin, TX',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://digital-dental-workflow.com',
            title: 'Digital Dental Workflow',
            description: 'Advanced dental practice with integrated digital workflow systems',
            relevanceScore: 0.90,
            location: 'Seattle, WA',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://smart-dental-clinic.com',
            title: 'Smart Dental Clinic',
            description: 'Innovative dental clinic using cutting-edge management technology',
            relevanceScore: 0.87,
            location: 'Denver, CO',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://tech-savvy-dentists.com',
            title: 'Tech-Savvy Dentists Group',
            description: 'Multi-location dental group with advanced practice management',
            relevanceScore: 0.84,
            location: 'Phoenix, AZ',
            companyType: 'Dental Group'
          },
          {
            url: 'https://modern-dental-systems.com',
            title: 'Modern Dental Systems',
            description: 'Contemporary dental practice with integrated software solutions',
            relevanceScore: 0.81,
            location: 'Portland, OR',
            companyType: 'Dental Practice'
          }
        ];
      } else if (productVertical.toLowerCase().includes('equipment') || productVertical.toLowerCase().includes('devices')) {
        mockResults = [
          {
            url: 'https://advanced-dental-equipment.com',
            title: 'Advanced Dental Equipment Co.',
            description: 'Dental practice with state-of-the-art equipment and devices',
            relevanceScore: 0.92,
            location: 'Dallas, TX',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://premium-dental-devices.com',
            title: 'Premium Dental Devices',
            description: 'High-end dental practice using premium equipment and devices',
            relevanceScore: 0.89,
            location: 'Atlanta, GA',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://innovative-dental-tech.com',
            title: 'Innovative Dental Technology',
            description: 'Cutting-edge dental practice with latest equipment',
            relevanceScore: 0.86,
            location: 'Nashville, TN',
            companyType: 'Dental Practice'
          }
        ];
      } else {
        // Generic dental customers for any dental product vertical
        mockResults = [
          {
            url: 'https://comprehensive-dental-care.com',
            title: 'Comprehensive Dental Care',
            description: 'Full-service dental practice serving diverse patient needs',
            relevanceScore: 0.90,
            location: 'San Diego, CA',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://family-dental-center.com',
            title: 'Family Dental Center',
            description: 'Family-oriented dental practice with modern facilities',
            relevanceScore: 0.87,
            location: 'Orlando, FL',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://premier-dental-group.com',
            title: 'Premier Dental Group',
            description: 'Multi-specialty dental group with advanced technology',
            relevanceScore: 0.84,
            location: 'Charlotte, NC',
            companyType: 'Dental Group'
          },
          {
            url: 'https://elite-dental-solutions.com',
            title: 'Elite Dental Solutions',
            description: 'Premium dental practice with comprehensive services',
            relevanceScore: 0.81,
            location: 'Las Vegas, NV',
            companyType: 'Dental Practice'
          },
          {
            url: 'https://modern-dental-care.com',
            title: 'Modern Dental Care',
            description: 'Contemporary dental practice with latest technology',
            relevanceScore: 0.78,
            location: 'Salt Lake City, UT',
            companyType: 'Dental Practice'
          }
        ];
      }
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
    console.log(`\n[AI Discovery] === DISCOVER INDUSTRIES START ===`);
    console.log(`[AI Discovery] User input: "${userInput}"`);
    console.log(`[AI Discovery] Constraints:`, constraints);
    
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
      console.log('[AI Discovery] Attempting to select AI_DISCOVERY service...');
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
        aiResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
        console.log('[AI Discovery] Claude API call completed successfully');
      } else if (aiService.type === 'AI_ENGINE') {
        // For other AI engines, try to use their specific APIs
        // For now, fallback to Claude
        console.log('[AI Discovery] AI_ENGINE type detected, falling back to Claude...');
        aiResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
        console.log('[AI Discovery] Claude API fallback call completed successfully');
      } else {
        // Fallback to Claude
        console.log('[AI Discovery] Using Claude as final fallback...');
        aiResponse = await callAIEngine(prompt, 'AI_DISCOVERY');
        console.log('[AI Discovery] Claude API final fallback call completed successfully');
      }

                   // Parse AI response into structured industry data
      const discoveredIndustries = this.parseIndustryDiscoveryResponse(aiResponse, userInput);
      console.log('[AI Discovery] Parsed industries with temporary IDs:', discoveredIndustries.map(s => ({ id: s.id, name: s.name })));
      
      // Apply criteria filtering and generate smart suggestions
      const filteredResults = this.applyCriteriaFiltering(discoveredIndustries, constraints);
      console.log('[AI Discovery] Filtered results with temporary IDs:', filteredResults.map(s => ({ id: s.id, name: s.name })));
      
      // Save discovered industries to database and get the actual database IDs
      const savedIndustries = await this.saveDiscoveredIndustries(filteredResults);
      console.log('[AI Discovery] Saved industries with database IDs:', savedIndustries.map(s => ({ id: s.id, name: s.name })));
      
      // Generate smart suggestions if results are limited
      const suggestions = this.generateSmartSuggestions(userInput, filteredResults, constraints);
      
      console.log(`[AI Discovery] Discovered and saved ${savedIndustries.length} industries using ${aiService.name}`);
      console.log(`[AI Discovery] Returning saved industries with database IDs:`, savedIndustries.map(s => ({ id: s.id, name: s.name })));
      
      return {
        industries: savedIndustries,
        totalFound: savedIndustries.length,
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
      const fallbackResult = await this.getFallbackIndustrySuggestions(userInput, constraints, errorDetails);
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
      
             // Validate and format results (without generating IDs - they'll be assigned by saveDiscoveredIndustries)
       return industries.map((industry: any, index: number) => ({
         id: `temp_${index}`, // Temporary ID that will be replaced by actual database ID
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
  private static async getFallbackIndustrySuggestions(
    userInput: string, 
    constraints?: any,
    errorDetails?: any
  ): Promise<any> {
    console.log('[Fallback] === GENERATING FALLBACK SUGGESTIONS ===');
    console.log('[Fallback] User input:', userInput);
    console.log('[Fallback] Constraints:', constraints);
    
    // Analyze user input for keywords and suggest relevant industries
    const input = userInput.toLowerCase();
    const suggestions = [];

         if (input.includes('healthcare') || input.includes('medical') || input.includes('health')) {
       suggestions.push({
         id: 'temp_0', // Temporary ID that will be replaced by actual database ID
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
         id: 'temp_1', // Temporary ID that will be replaced by actual database ID
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
         id: 'temp_2', // Temporary ID that will be replaced by actual database ID
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
         id: 'temp_0', // Temporary ID that will be replaced by actual database ID
         name: 'Business Services',
         description: 'General B2B services and solutions',
         marketSize: '$100B+',
         growthRate: '6% annually',
         relevanceScore: 0.7,
         reasoning: 'General business focus in user input',
         suggestedVerticals: ['Consulting Services', 'Business Solutions', 'Professional Services']
       });
     }

    // Save fallback industries to database
    const savedIndustries = await this.saveDiscoveredIndustries(suggestions);
    
    const result = {
      industries: savedIndustries,
      totalFound: savedIndustries.length,
      aiEngineUsed: 'Fallback Analysis',
      configurationError: errorDetails,
      fallbackReason: errorDetails ? errorDetails.userMessage : 'AI service temporarily unavailable'
    };
    
    console.log('[Fallback] Generated and saved suggestions:', savedIndustries.map(s => s.name));
    console.log('[Fallback] === FALLBACK SUGGESTIONS COMPLETE ===');
    return result;
  }
} 