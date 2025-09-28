const { AIDiscoveryService } = require('./dist/src/services/aiDiscoveryService');

async function testAIDiscovery() {
  console.log('=== TESTING AI DISCOVERY WITH DETAILED LOGGING ===\n');
  
  try {
    console.log('Calling AIDiscoveryService.discoverIndustries...');
    
    const result = await AIDiscoveryService.discoverIndustries(
      'software development tools',
      {
        maxIndustries: 3,
        marketSize: '1B',
        growthRate: '10'
      }
    );
    
    console.log('\n=== AI DISCOVERY RESULT ===');
    console.log('Success! Found industries:', result.industries.length);
    console.log('AI Engine used:', result.aiEngineUsed);
    console.log('Total found:', result.totalFound);
    
    if (result.industries.length > 0) {
      console.log('\nFirst industry:');
      console.log('- Name:', result.industries[0].name);
      console.log('- Description:', result.industries[0].description);
      console.log('- Market Size:', result.industries[0].marketSize);
      console.log('- Growth Rate:', result.industries[0].growthRate);
    }
    
  } catch (error) {
    console.error('\n=== AI DISCOVERY FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAIDiscovery();
