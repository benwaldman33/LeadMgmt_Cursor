const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAPIKeys() {
  console.log('=== CHECKING API KEY CONFIGURATIONS ===\n');
  
  try {
    // Get all service providers
    const serviceProviders = await prisma.serviceProvider.findMany({
      where: { isActive: true },
      include: {
        operationMappings: {
          where: { isEnabled: true }
        }
      }
    });

    console.log(`Found ${serviceProviders.length} active service providers:\n`);

    serviceProviders.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.name}`);
      console.log(`   Type: ${provider.type}`);
      console.log(`   Priority: ${provider.priority}`);
      console.log(`   Active: ${provider.isActive}`);
      console.log(`   Operation mappings: ${provider.operationMappings.length}`);
      
      // Parse and check the config
      try {
        const config = JSON.parse(provider.config);
        console.log(`   Config:`);
        console.log(`     Has API key: ${!!config.apiKey}`);
        console.log(`     API key length: ${config.apiKey?.length || 0}`);
        console.log(`     API key starts with: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'none'}`);
        console.log(`     Model: ${config.model || 'not set'}`);
        console.log(`     Endpoint: ${config.endpoint || 'not set'}`);
        console.log(`     Max tokens: ${config.maxTokens || 'not set'}`);
        
        // Check if API key looks valid
        if (config.apiKey) {
          if (config.apiKey === '[ENCRYPTED]') {
            console.log(`     API key status: ENCRYPTED (needs decryption)`);
          } else if (config.apiKey.startsWith('sk-')) {
            console.log(`     API key status: VALID FORMAT`);
          } else if (config.apiKey === 'your-api-key' || config.apiKey === '') {
            console.log(`     API key status: INVALID (placeholder or empty)`);
          } else {
            console.log(`     API key status: UNKNOWN FORMAT`);
          }
        } else {
          console.log(`     API key status: MISSING`);
        }
      } catch (error) {
        console.log(`   Config parsing error: ${error.message}`);
      }
      
      // Parse and check capabilities
      try {
        const capabilities = JSON.parse(provider.capabilities);
        console.log(`   Capabilities: ${capabilities.join(', ')}`);
      } catch (error) {
        console.log(`   Capabilities parsing error: ${error.message}`);
      }
      
      console.log('');
    });

    // Check operation mappings specifically
    console.log('=== OPERATION MAPPINGS ===\n');
    
    const operationMappings = await prisma.operationServiceMapping.findMany({
      where: { isEnabled: true },
      include: { service: true },
      orderBy: [
        { operation: 'asc' },
        { priority: 'asc' }
      ]
    });

    console.log(`Found ${operationMappings.length} enabled operation mappings:\n`);

    const operations = {};
    operationMappings.forEach(mapping => {
      if (!operations[mapping.operation]) {
        operations[mapping.operation] = [];
      }
      operations[mapping.operation].push(mapping);
    });

    Object.keys(operations).forEach(operation => {
      console.log(`${operation}:`);
      operations[operation].forEach((mapping, index) => {
        console.log(`  ${index + 1}. ${mapping.service.name} (Priority: ${mapping.priority})`);
      });
      console.log('');
    });

    // Check system config for any global API keys
    console.log('=== SYSTEM CONFIGURATION ===\n');
    
    const systemConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          contains: 'API'
        }
      }
    });

    if (systemConfigs.length > 0) {
      console.log(`Found ${systemConfigs.length} API-related system configs:\n`);
      systemConfigs.forEach(config => {
        console.log(`${config.key}:`);
        console.log(`  Value length: ${config.value.length}`);
        console.log(`  Is encrypted: ${config.isEncrypted}`);
        console.log(`  Value preview: ${config.value.substring(0, 20)}...`);
        console.log('');
      });
    } else {
      console.log('No API-related system configs found.\n');
    }

  } catch (error) {
    console.error('Error checking API keys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAPIKeys().then(() => {
  console.log('=== CHECK COMPLETE ===');
}).catch(error => {
  console.error('Check failed:', error);
});
