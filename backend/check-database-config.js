const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function checkDatabaseConfig() {
  console.log('=== CHECKING DATABASE SERVICE CONFIGURATIONS ===\n');
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');
    
    // Check all service providers
    console.log('=== ALL SERVICE PROVIDERS ===');
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
      
      // Parse and display the configuration
      try {
        const config = JSON.parse(provider.config);
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
    
    // Check AI_DISCOVERY operation mappings specifically
    console.log('=== AI_DISCOVERY OPERATION MAPPINGS ===');
    const aiDiscoveryMappings = await prisma.operationServiceMapping.findMany({
      where: { 
        operation: 'AI_DISCOVERY',
        isEnabled: true 
      },
      include: { 
        service: true 
      },
      orderBy: { priority: 'asc' }
    });
    
    console.log(`Found ${aiDiscoveryMappings.length} AI_DISCOVERY mappings:\n`);
    
    aiDiscoveryMappings.forEach((mapping, index) => {
      const service = mapping.service;
      console.log(`${index + 1}. ${service.name} (Priority: ${mapping.priority})`);
      console.log(`   Type: ${service.type}`);
      console.log(`   Active: ${service.isActive}`);
      
      // Parse the configuration
      try {
        const config = JSON.parse(service.config);
        console.log(`   API Key: ${config.apiKey ? config.apiKey.substring(0, 20) + '...' : 'MISSING'}`);
        console.log(`   Model: ${config.model || 'NOT SET'}`);
        
        // Check if this is a placeholder
        if (config.apiKey === 'your-claude-api-key' || config.apiKey === 'your-openai-api-key') {
          console.log(`   ⚠️  WARNING: This has a placeholder API key!`);
        } else if (config.apiKey && config.apiKey.startsWith('sk-')) {
          console.log(`   ✅ This has a real API key`);
        }
      } catch (error) {
        console.log(`   Configuration parsing error: ${error.message}`);
      }
      
      console.log('');
    });
    
    // Check if there are any system configs
    console.log('=== SYSTEM CONFIGURATIONS ===');
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
    
    console.log('=== SUMMARY ===');
    const placeholderCount = serviceProviders.filter(provider => {
      try {
        const config = JSON.parse(provider.config);
        return config.apiKey === 'your-claude-api-key' || config.apiKey === 'your-openai-api-key';
      } catch {
        return false;
      }
    }).length;
    
    console.log(`Service providers with placeholder API keys: ${placeholderCount}/${serviceProviders.length}`);
    
    if (placeholderCount > 0) {
      console.log('❌ This explains why AI Discovery is using Fallback Analysis!');
      console.log('The AI engines have placeholder API keys instead of real ones.');
    } else {
      console.log('✅ All service providers have real API keys.');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
    
    if (error.code === 'P1001') {
      console.log('\nDatabase connection failed. Make sure:');
      console.log('1. Docker containers are running: docker-compose ps');
      console.log('2. Database is accessible on localhost:5433');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseConfig().then(() => {
  console.log('\n=== DATABASE CHECK COMPLETE ===');
}).catch(console.error);
