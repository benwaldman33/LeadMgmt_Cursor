console.log('=== TESTING AI DISCOVERY THROUGH RUNNING BACKEND ===\n');

async function testAIDiscoveryAPI() {
  try {
    console.log('Testing AI Discovery through the running backend service...');
    console.log('Backend should be running on http://localhost:3001');
    
    const response = await fetch('http://localhost:3001/api/ai-discovery/discover', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: 'I want to explore opportunities in healthcare technology',
        constraints: {
          maxIndustries: 5,
          focusAreas: ['healthcare']
        }
      })
    });

    console.log('Response status:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n=== AI DISCOVERY RESULT ===');
      console.log('Success:', result.success !== false);
      console.log('Industries found:', result.totalFound);
      console.log('AI Engine used:', result.aiEngineUsed);
      console.log('Has configuration error:', !!result.configurationError);
      
      if (result.configurationError) {
        console.log('\nConfiguration error details:');
        console.log('- Type:', result.configurationError.type);
        console.log('- Severity:', result.configurationError.severity);
        console.log('- User message:', result.configurationError.userMessage);
        console.log('- Technical details:', result.configurationError.technicalDetails);
      }
      
      if (result.industries && result.industries.length > 0) {
        console.log('\nIndustries discovered:');
        result.industries.forEach((industry, index) => {
          console.log(`${index + 1}. ${industry.name} - ${industry.description}`);
        });
      }
      
      console.log('\n=== CONCLUSION ===');
      if (result.aiEngineUsed === 'Fallback Analysis') {
        console.log('❌ AI Discovery is still using Fallback Analysis');
        console.log('This means the AI engines are not working properly');
      } else {
        console.log('✅ AI Discovery is working with:', result.aiEngineUsed);
        console.log('The priority system is functioning correctly');
      }
      
    } else {
      const errorText = await response.text();
      console.error('API call failed:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nThis could mean:');
    console.log('1. The backend is not running on port 3001');
    console.log('2. There\'s a network connectivity issue');
    console.log('3. The API endpoint is different');
  }
}

testAIDiscoveryAPI().then(() => {
  console.log('\n=== TEST COMPLETE ===');
}).catch(console.error);
