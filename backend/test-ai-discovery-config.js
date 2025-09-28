const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAIDiscoveryConfiguration() {
  console.log('=== CHECKING AI DISCOVERY CONFIGURATION ===\n');
  
  try {
    // Check if database is accessible
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');
    
    // Get all service providers for AI_DISCOVERY operation
    console.log('Fetching service providers for AI_DISCOVERY...');
    
    const operationMappings = await prisma.operationServiceMapping.findMany({
      where: { 
        operation: 'AI_DISCOVERY',
        isEnabled: true 
      },
      include: { 
        service: true 
      },
      orderBy: { priority: 'asc' }
    });
    
    console.log(`Found ${operationMappings.length} AI_DISCOVERY operation mappings:\n`);
    
    operationMappings.forEach((mapping, index) => {
      const service = mapping.service;
      console.log(`${index + 1}. ${service.name} (Priority: ${mapping.priority})`);
      console.log(`   Type: ${service.type}`);
      console.log(`   Active: ${service.isActive}`);
      
      // Parse the configuration
      try {
        const config = JSON.parse(service.config);
        console.log(`   Configuration:`);
        console.log(`     API Key: ${config.apiKey ? config.apiKey.substring(0, 20) + '...' : 'MISSING'}`);
        console.log(`     Model: ${config.model || 'NOT SET'}`);
        console.log(`     Endpoint: ${config.endpoint || 'NOT SET'}`);
        console.log(`     Max Tokens: ${config.maxTokens || 'NOT SET'}`);
        
        // Check if API key looks valid
        if (config.apiKey) {
          if (config.apiKey === '[ENCRYPTED]') {
            console.log(`     API Key Status: ENCRYPTED (needs decryption)`);
          } else if (config.apiKey.startsWith('sk-')) {
            console.log(`     API Key Status: VALID FORMAT`);
          } else if (config.apiKey === 'your-api-key' || config.apiKey === 'your-claude-api-key') {
            console.log(`     API Key Status: INVALID (placeholder)`);
          } else {
            console.log(`     API Key Status: UNKNOWN FORMAT`);
          }
        } else {
          console.log(`     API Key Status: MISSING`);
        }
      } catch (error) {
        console.log(`   Configuration parsing error: ${error.message}`);
      }
      
      console.log('');
    });
    
    // Check if there are any service providers at all
    const allProviders = await prisma.serviceProvider.findMany({
      where: { isActive: true }
    });
    
    console.log(`Total active service providers: ${allProviders.length}`);
    allProviders.forEach(provider => {
      console.log(`- ${provider.name} (${provider.type})`);
    });
    
    console.log('\n=== CONFIGURATION CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('Error checking configuration:', error);
    
    if (error.code === 'P1001') {
      console.log('\nDatabase is not running. This explains why AI Discovery is failing.');
      console.log('The AI Discovery service needs the database to get service configurations.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkAIDiscoveryConfiguration().catch(console.error);
