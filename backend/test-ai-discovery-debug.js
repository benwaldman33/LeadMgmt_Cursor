const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAIDiscoveryDebug() {
  console.log('�� AI Discovery Debug Test Starting...\n');
  
  try {
    // Test 1: Check if database is accessible
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    // Test 2: Check what service providers exist
    console.log('2️⃣ Checking service providers...');
    const serviceProviders = await prisma.serviceProvider.findMany({
      where: { isActive: true }
    });
    console.log(`Found ${serviceProviders.length} active service providers:`);
    serviceProviders.forEach(sp => {
      console.log(`  - ${sp.name} (${sp.type}) - Active: ${sp.isActive}`);
    });
    console.log('');
    
    // Test 3: Check what operations exist
    console.log('3️⃣ Checking operations...');
    const operations = await prisma.operationServiceMapping.findMany({
      where: { isEnabled: true },
      include: { service: true }
    });
    console.log(`Found ${operations.length} enabled operation mappings:`);
    operations.forEach(op => {
      console.log(`  - Operation: ${op.operation} -> Service: ${op.service.name} (${op.service.type})`);
    });
    console.log('');
    
    // Test 4: Check system configuration
    console.log('4️⃣ Checking system configuration...');
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          contains: 'CLAUDE'
        }
      }
    });
    console.log(`Found ${configs.length} Claude-related configs:`);
    configs.forEach(config => {
      console.log(`  - ${config.key}: ${config.isEncrypted ? '[ENCRYPTED]' : config.value}`);
    });
    console.log('');
    
    // Test 5: Test ServiceConfigurationService directly
    console.log('5️⃣ Testing ServiceConfigurationService...');
    try {
      const { ServiceConfigurationService } = require('./src/services/serviceConfigurationService');
      const service = new ServiceConfigurationService();
      
      console.log('✅ ServiceConfigurationService created successfully');
      
      // Test getAllServiceProviders
      const allServices = await service.getAllServiceProviders();
      console.log(`getAllServiceProviders returned ${allServices.length} services`);
      
      // Test selectService for different operations
      const operationsToTest = ['AI_DISCOVERY', 'MARKET_DISCOVERY', 'AI_ENGINE'];
      for (const op of operationsToTest) {
        try {
          const selectedService = await service.selectService(op);
          console.log(`selectService('${op}') returned:`, selectedService ? selectedService.name : 'null');
        } catch (error) {
          console.log(`selectService('${op}') failed:`, error.message);
        }
      }
      
    } catch (error) {
      console.log('❌ ServiceConfigurationService test failed:', error.message);
    }
    
    // Test 6: Check if there are any AI-related services
    console.log('\n6️⃣ Checking for AI-related services...');
    const aiServices = serviceProviders.filter(sp => 
      sp.type === 'AI_ENGINE' || 
      sp.name.toLowerCase().includes('claude') || 
      sp.name.toLowerCase().includes('gpt') ||
      sp.name.toLowerCase().includes('ai')
    );
    console.log(`Found ${aiServices.length} AI-related services:`);
    aiServices.forEach(sp => {
      console.log(`  - ${sp.name} (${sp.type})`);
    });
    
    // Test 7: Check operation mappings for AI services
    console.log('\n7️⃣ Checking operation mappings for AI services...');
    const aiOperationMappings = operations.filter(op => 
      op.service.type === 'AI_ENGINE' || 
      op.service.name.toLowerCase().includes('claude') || 
      op.service.name.toLowerCase().includes('gpt')
    );
    console.log(`Found ${aiOperationMappings.length} AI service operation mappings:`);
    aiOperationMappings.forEach(op => {
      console.log(`  - ${op.operation} -> ${op.service.name} (${op.service.type})`);
    });
    
    // Test 8: Check if Claude API key is accessible
    console.log('\n8️⃣ Testing Claude API key access...');
    try {
      const claudeKey = await prisma.systemConfig.findUnique({
        where: { key: 'CLAUDE_API_KEY' }
      });
      if (claudeKey) {
        console.log(`CLAUDE_API_KEY exists: ${claudeKey.isEncrypted ? '[ENCRYPTED]' : '[PRESENT]'}`);
      } else {
        console.log('CLAUDE_API_KEY not found');
      }
      
      const claudeKeyAlt = await prisma.systemConfig.findUnique({
        where: { key: 'Claude_API_Key' }
      });
      if (claudeKeyAlt) {
        console.log(`Claude_API_Key exists: ${claudeKeyAlt.isEncrypted ? '[ENCRYPTED]' : '[PRESENT]'}`);
      } else {
        console.log('Claude_API_Key not found');
      }
    } catch (error) {
      console.log('❌ Claude API key check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔍 Debug test completed');
  }
}

// Run the test
testAIDiscoveryDebug();