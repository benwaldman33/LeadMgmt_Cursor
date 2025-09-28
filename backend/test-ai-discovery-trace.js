const { PrismaClient } = require('@prisma/client');

// Mock the ServiceConfigurationService to trace the flow
class MockServiceConfigurationService {
  constructor() {
    console.log('[Mock] ServiceConfigurationService created');
  }

  async getAvailableServices(operation) {
    console.log(`[Mock] getAvailableServices called with operation: ${operation}`);
    
    // Mock the database query that would normally happen
    const mockServices = [
      {
        id: '1',
        name: 'OpenAI GPT-4',
        type: 'AI_ENGINE',
        priority: 1,
        isActive: true,
        config: JSON.stringify({
          apiKey: 'sk-test-openai-key',
          model: 'gpt-4',
          maxTokens: 4096,
          endpoint: 'https://api.openai.com/v1'
        }),
        capabilities: JSON.stringify(['AI_DISCOVERY', 'AI_SCORING'])
      },
      {
        id: '2',
        name: 'Claude Sonnet',
        type: 'AI_ENGINE',
        priority: 2,
        isActive: true,
        config: JSON.stringify({
          apiKey: 'sk-ant-test-claude-key',
          model: 'claude-3-sonnet-20240229',
          maxTokens: 4096,
          endpoint: 'https://api.anthropic.com/v1'
        }),
        capabilities: JSON.stringify(['AI_DISCOVERY', 'AI_SCORING'])
      },
      {
        id: '3',
        name: 'Grok Beta',
        type: 'AI_ENGINE',
        priority: 3,
        isActive: true,
        config: JSON.stringify({
          apiKey: 'sk-test-grok-key',
          model: 'grok-beta',
          maxTokens: 4096,
          endpoint: 'https://api.x.ai/v1'
        }),
        capabilities: JSON.stringify(['AI_DISCOVERY', 'AI_SCORING'])
      }
    ];

    console.log(`[Mock] Returning ${mockServices.length} services for operation: ${operation}`);
    mockServices.forEach((service, index) => {
      console.log(`[Mock] Service ${index + 1}: ${service.name} (Priority: ${service.priority}, Active: ${service.isActive})`);
    });

    return mockServices;
  }

  async selectService(operation) {
    console.log(`[Mock] selectService called with operation: ${operation}`);
    const services = await this.getAvailableServices(operation);
    const aiEngines = services.filter(service => service.type === 'AI_ENGINE');
    
    if (aiEngines.length > 0) {
      // Sort by priority and return the first one
      aiEngines.sort((a, b) => a.priority - b.priority);
      console.log(`[Mock] Selected service: ${aiEngines[0].name} (Priority: ${aiEngines[0].priority})`);
      return aiEngines[0];
    }
    
    console.log(`[Mock] No AI engines found for operation: ${operation}`);
    return null;
  }

  async getAllServiceProviders() {
    console.log('[Mock] getAllServiceProviders called');
    return await this.getAvailableServices('AI_DISCOVERY');
  }
}

// Mock the callAIEngine function to trace the flow
async function mockCallAIEngine(prompt, operation) {
  console.log(`\n[Mock] === DYNAMIC AI ENGINE CALL START ===`);
  console.log(`[Mock] Operation: ${operation}`);
  console.log(`[Mock] Prompt length: ${prompt.length} characters`);
  
  const serviceConfigService = new MockServiceConfigurationService();
  
  try {
    // Get available AI engines for this operation
    console.log(`[Mock] Fetching available services for operation: ${operation}`);
    const availableServices = await serviceConfigService.getAvailableServices(operation);
    console.log(`[Mock] Total available services: ${availableServices.length}`);
    
    const aiEngines = availableServices.filter(service => service.type === 'AI_ENGINE');
    console.log(`[Mock] AI engines found: ${aiEngines.length}`);
    
    // Log each service found
    availableServices.forEach((service, index) => {
      console.log(`[Mock] Service ${index + 1}: ${service.name} (Type: ${service.type}, Priority: ${service.priority}, Active: ${service.isActive})`);
    });
    
    if (aiEngines.length === 0) {
      console.error(`[Mock] No AI engines available for operation: ${operation}`);
      console.log(`[Mock] Available service types:`, availableServices.map(s => s.type));
      throw new Error(`No AI engines available for operation: ${operation}`);
    }
    
    // Sort by priority (lower number = higher priority)
    console.log(`[Mock] Sorting engines by priority...`);
    aiEngines.sort((a, b) => a.priority - b.priority);
    
    console.log(`[Mock] Engine priority order:`);
    aiEngines.forEach((engine, index) => {
      console.log(`[Mock] ${index + 1}. ${engine.name} (Priority: ${engine.priority})`);
    });
    
    // Try each AI engine in priority order
    for (let i = 0; i < aiEngines.length; i++) {
      const engine = aiEngines[i];
      console.log(`\n[Mock] === ATTEMPTING ENGINE ${i + 1}/${aiEngines.length} ===`);
      console.log(`[Mock] Engine: ${engine.name}`);
      console.log(`[Mock] Priority: ${engine.priority}`);
      console.log(`[Mock] Type: ${engine.type}`);
      console.log(`[Mock] Active: ${engine.isActive}`);
      
      try {
        console.log(`[Mock] Calling ${engine.name}...`);
        const result = await mockCallSpecificAIEngine(engine, prompt);
        console.log(`[Mock] === AI ENGINE CALL SUCCESS (${engine.name}) ===`);
        console.log(`[Mock] Engine used: ${engine.name}`);
        console.log(`[Mock] Priority: ${engine.priority}`);
        return {
          ...result,
          engineUsed: engine.name,
          priority: engine.priority
        };
      } catch (error) {
        console.error(`[Mock] AI engine ${engine.name} failed:`);
        console.error(`[Mock] Error type: ${error.constructor.name}`);
        console.error(`[Mock] Error message: ${error.message}`);
        
        // If this is the last engine, throw the error
        if (i === aiEngines.length - 1) {
          console.error(`[Mock] All ${aiEngines.length} AI engines failed. Throwing final error.`);
          throw new Error(`All AI engines failed. Last error: ${error.message}`);
        }
        
        // Otherwise, continue to the next engine
        console.log(`[Mock] Continuing to next AI engine...`);
      }
    }
    
    throw new Error('No AI engines available');
    
  } catch (error) {
    console.error('[Mock] === DYNAMIC AI ENGINE CALL FAILED ===');
    console.error('[Mock] Final error:', error);
    console.error('[Mock] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Mock the callSpecificAIEngine function
async function mockCallSpecificAIEngine(engine, prompt) {
  console.log(`[Mock] === CALLING SPECIFIC ENGINE: ${engine.name} ===`);
  
  try {
    const config = JSON.parse(engine.config);
    const capabilities = JSON.parse(engine.capabilities);
    
    console.log(`[Mock] Engine config parsed successfully`);
    console.log(`[Mock] Config details:`, {
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
    console.log(`[Mock] Engine name (lowercase): ${engineName}`);
    
    // Simulate API call failure for testing
    if (engineName.includes('openai')) {
      console.log(`[Mock] Simulating OpenAI API failure...`);
      throw new Error('OpenAI API error: 401 Unauthorized - Invalid API key');
    } else if (engineName.includes('claude')) {
      console.log(`[Mock] Simulating Claude API failure...`);
      throw new Error('Claude API error: 401 Unauthorized - Invalid API key');
    } else if (engineName.includes('grok')) {
      console.log(`[Mock] Simulating Grok API failure...`);
      throw new Error('Grok API error: 401 Unauthorized - Invalid API key');
    } else {
      console.log(`[Mock] Unknown engine type, defaulting to Claude API`);
      throw new Error('Unknown engine type - API call failed');
    }
    
  } catch (error) {
    console.error(`[Mock] === ENGINE ${engine.name} CONFIGURATION ERROR ===`);
    console.error(`[Mock] Error parsing engine config:`, error);
    throw error;
  }
}

// Mock the analyzeClaudeError function
function mockAnalyzeClaudeError(error) {
  const errorMessage = error.message || '';
  
  console.log(`[Mock] Analyzing error: ${errorMessage}`);
  
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

// Mock the getFallbackIndustrySuggestions function
function mockGetFallbackIndustrySuggestions(userInput, constraints, errorDetails) {
  console.log('[Mock] === GENERATING FALLBACK SUGGESTIONS ===');
  console.log('[Mock] User input:', userInput);
  console.log('[Mock] Constraints:', constraints);
  console.log('[Mock] Error details:', errorDetails);
  
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
  
  console.log('[Mock] Generated suggestions:', suggestions.map(s => s.name));
  console.log('[Mock] === FALLBACK SUGGESTIONS COMPLETE ===');
  return result;
}

// Mock the discoverIndustries function
async function mockDiscoverIndustries(userInput, constraints) {
  console.log(`\n[Mock] === DISCOVER INDUSTRIES START ===`);
  console.log(`[Mock] User input: "${userInput}"`);
  console.log(`[Mock] Constraints:`, constraints);
  
  try {
    console.log(`[Mock] Starting AI-driven industry discovery for: "${userInput}" with criteria:`, constraints);
    
    // Get the best available AI service for industry discovery
    const serviceConfigService = new MockServiceConfigurationService();
    console.log('[Mock] ServiceConfigurationService created, selecting AI_DISCOVERY service...');
    
    // Try different operation names that might be configured
    console.log('[Mock] Attempting to select AI_DISCOVERY service...');
    let aiService = await serviceConfigService.selectService('AI_DISCOVERY');
    if (!aiService) {
      console.log('[Mock] AI_DISCOVERY not found, trying MARKET_DISCOVERY...');
      aiService = await serviceConfigService.selectService('MARKET_DISCOVERY');
    }
    if (!aiService) {
      console.log('[Mock] MARKET_DISCOVERY not found, trying AI_ENGINE...');
      aiService = await serviceConfigService.selectService('AI_ENGINE');
    }
    
    // Fallback: try to get any available AI service
    if (!aiService) {
      console.log('[Mock] No specific operations found, trying to get any AI service...');
      const allServices = await serviceConfigService.getAllServiceProviders();
      const aiServices = allServices.filter((s) => 
        s.isActive && (s.type === 'AI_ENGINE' || s.name.toLowerCase().includes('claude') || s.name.toLowerCase().includes('gpt'))
      );
      if (aiServices.length > 0) {
        aiService = aiServices[0];
        console.log('[Mock] Using fallback AI service:', aiService.name);
      }
    }
    
    console.log('[Mock] AI service selection result:', aiService);
    
    if (!aiService) {
      console.error('[Mock] No AI service available for any discovery operation');
      throw new Error('No AI service available for industry discovery');
    }

    console.log('[Mock] Using AI service:', aiService.name, 'Type:', aiService.type);

    // Build AI prompt for industry discovery with criteria
    const prompt = `Analyze the following business opportunity and suggest relevant industries: ${userInput}`;
    console.log('[Mock] Built prompt length:', prompt.length);
    console.log('[Mock] Prompt preview:', prompt.substring(0, 200) + '...');
    
    // Call the configured AI service
    let aiResponse;
    console.log('[Mock] About to call AI service:', aiService.name);
    
    if (aiService.name.includes('Claude')) {
      console.log('[Mock] Calling Claude API directly...');
      aiResponse = await mockCallAIEngine(prompt, 'AI_DISCOVERY');
      console.log('[Mock] Claude API call completed successfully');
    } else if (aiService.type === 'AI_ENGINE') {
      // For other AI engines, try to use their specific APIs
      // For now, fallback to Claude
      console.log('[Mock] AI_ENGINE type detected, falling back to Claude...');
      aiResponse = await mockCallAIEngine(prompt, 'AI_DISCOVERY');
      console.log('[Mock] Claude API fallback call completed successfully');
    } else {
      // Fallback to Claude
      console.log('[Mock] Using Claude as final fallback...');
      aiResponse = await mockCallAIEngine(prompt, 'AI_DISCOVERY');
      console.log('[Mock] Claude API final fallback call completed successfully');
    }

    // Parse AI response into structured industry data
    const discoveredIndustries = [{ id: 'test', name: 'Test Industry', description: 'Test description' }];
    
    // Apply criteria filtering and generate smart suggestions
    const filteredResults = discoveredIndustries;
    
    // Generate smart suggestions if results are limited
    const suggestions = { marketInsights: 'Test insights' };
    
    console.log(`[Mock] Discovered ${filteredResults.length} industries using ${aiService.name}`);
    
    return {
      industries: filteredResults,
      totalFound: filteredResults.length,
      aiEngineUsed: aiService.name,
      suggestions
    };

  } catch (error) {
    console.error('[Mock] === AI DISCOVERY FAILED ===');
    console.error('[Mock] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });
    
    // Enhanced error handling with user-friendly messages
    const errorDetails = mockAnalyzeClaudeError(error);
    console.error('[Mock] Error analysis:', errorDetails);
    
    // Fallback to intelligent industry suggestions based on user input
    const fallbackResult = mockGetFallbackIndustrySuggestions(userInput, constraints, errorDetails);
    console.log('[Mock] Fallback result generated:', {
      industriesCount: fallbackResult.industries.length,
      aiEngineUsed: fallbackResult.aiEngineUsed,
      hasConfigurationError: !!fallbackResult.configurationError
    });
    console.log('[Mock] === FALLBACK COMPLETE ===');
    return fallbackResult;
  }
}

// Main test function
async function testAIDiscoveryFlow() {
  console.log('=== AI DISCOVERY FLOW TRACE TEST ===\n');
  
  try {
    const userInput = 'I want to explore opportunities in healthcare technology';
    const constraints = { maxIndustries: 5, focusAreas: ['healthcare'] };
    
    console.log('Starting AI Discovery test...');
    console.log('User input:', userInput);
    console.log('Constraints:', constraints);
    console.log('');
    
    const result = await mockDiscoverIndustries(userInput, constraints);
    
    console.log('\n=== FINAL RESULT ===');
    console.log('Success:', result.success !== false);
    console.log('Industries found:', result.totalFound);
    console.log('AI Engine used:', result.aiEngineUsed);
    console.log('Has configuration error:', !!result.configurationError);
    
    if (result.configurationError) {
      console.log('Configuration error details:');
      console.log('- Type:', result.configurationError.type);
      console.log('- Severity:', result.configurationError.severity);
      console.log('- User message:', result.configurationError.userMessage);
      console.log('- Technical details:', result.configurationError.technicalDetails);
      console.log('- Suggested actions:', result.configurationError.suggestedActions);
    }
    
    if (result.industries && result.industries.length > 0) {
      console.log('\nIndustries:');
      result.industries.forEach((industry, index) => {
        console.log(`${index + 1}. ${industry.name} - ${industry.description}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testAIDiscoveryFlow().then(() => {
  console.log('\n=== TEST COMPLETE ===');
}).catch(error => {
  console.error('Test execution failed:', error);
});
