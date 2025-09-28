// Mock test to demonstrate AI Discovery logging without database
console.log('=== MOCK AI DISCOVERY LOGGING TEST ===\n');

// Simulate the callAIEngine function with detailed logging
async function mockCallAIEngine(prompt, operation = 'AI_DISCOVERY') {
  console.log(`\n[AI Discovery] === DYNAMIC AI ENGINE CALL START ===`);
  console.log(`[AI Discovery] Operation: ${operation}`);
  console.log(`[AI Discovery] Prompt length: ${prompt.length} characters`);
  
  try {
    // Simulate getting available services
    console.log(`[AI Discovery] Fetching available services for operation: ${operation}`);
    
    // Mock available services - this is what would come from the database
    const availableServices = [
      {
        id: '1',
        name: 'Claude Sonnet',
        type: 'AI_ENGINE',
        priority: 1,
        isActive: true,
        config: JSON.stringify({
          apiKey: 'sk-ant-...',
          model: 'claude-3-sonnet-20240229',
          endpoint: 'https://api.anthropic.com/v1'
        }),
        capabilities: JSON.stringify(['AI_DISCOVERY', 'MARKET_ANALYSIS'])
      },
      {
        id: '2', 
        name: 'Claude Haiku',
        type: 'AI_ENGINE',
        priority: 2,
        isActive: true,
        config: JSON.stringify({
          apiKey: 'sk-ant-...',
          model: 'claude-3-haiku-20240307',
          endpoint: 'https://api.anthropic.com/v1'
        }),
        capabilities: JSON.stringify(['AI_DISCOVERY'])
      },
      {
        id: '3',
        name: 'GPT-4',
        type: 'AI_ENGINE', 
        priority: 3,
        isActive: false, // This one is inactive
        config: JSON.stringify({
          apiKey: 'sk-...',
          model: 'gpt-4',
          endpoint: 'https://api.openai.com/v1'
        }),
        capabilities: JSON.stringify(['AI_DISCOVERY'])
      }
    ];
    
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
        
        // Simulate API call
        if (engine.name === 'Claude Sonnet') {
          // Simulate success for first engine
          console.log(`[AI Discovery] === AI ENGINE CALL SUCCESS (${engine.name}) ===`);
          console.log(`[AI Discovery] Engine used: ${engine.name}`);
          console.log(`[AI Discovery] Priority: ${engine.priority}`);
          return {
            content: [{ text: 'Mock response from Claude Sonnet' }],
            engineUsed: engine.name,
            priority: engine.priority
          };
        } else if (engine.name === 'Claude Haiku') {
          // Simulate failure for second engine
          throw new Error('API rate limit exceeded');
        } else {
          // Simulate failure for third engine
          throw new Error('Service unavailable');
        }
        
      } catch (error) {
        console.error(`[AI Discovery] AI engine ${engine.name} failed:`);
        console.error(`[AI Discovery] Error type: ${error.constructor.name}`);
        console.error(`[AI Discovery] Error message: ${error.message}`);
        
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
    throw error;
  }
}

// Test the mock function
async function testMockAIDiscovery() {
  try {
    console.log('Testing AI Discovery with mock engines...');
    
    const result = await mockCallAIEngine(
      'Find industries related to software development tools',
      'AI_DISCOVERY'
    );
    
    console.log('\n=== SUCCESS ===');
    console.log('Result:', result);
    
  } catch (error) {
    console.log('\n=== FAILED ===');
    console.log('Error:', error.message);
  }
}

testMockAIDiscovery();
