const { PrismaClient } = require('@prisma/client');
const { AIDiscoveryService } = require('./dist/src/services/aiDiscoveryService');

const prisma = new PrismaClient();

async function testAIDiscovery() {
  try {
    console.log('=== Testing AI Discovery with Comprehensive Logging ===\n');
    
    // Test the AI discovery service
    const result = await AIDiscoveryService.discoverIndustries(
      'I want to sell software to healthcare companies',
      { maxIndustries: 3 }
    );
    
    console.log('\n=== AI DISCOVERY RESULT ===');
    console.log('Success:', result.success !== false);
    console.log('AI Engine Used:', result.aiEngineUsed);
    console.log('Industries Found:', result.totalFound);
    console.log('Industries:', result.industries.map(i => i.name));
    
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAIDiscovery();
