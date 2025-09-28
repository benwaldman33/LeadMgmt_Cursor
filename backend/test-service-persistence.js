const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testServicePersistence() {
  try {
    console.log('=== TESTING SERVICE CONFIGURATION PERSISTENCE ===');
    
    // Get all AI engines
    const aiEngines = await prisma.serviceProvider.findMany({
      where: { type: 'AI_ENGINE' },
      orderBy: { priority: 'asc' }
    });
    
    console.log('Current AI engines in database:');
    aiEngines.forEach(engine => {
      const config = JSON.parse(engine.config);
      console.log(`- ${engine.name} (ID: ${engine.id})`);
      console.log(`  Priority: ${engine.priority}`);
      console.log(`  API Key length: ${config.apiKey?.length || 0}`);
      console.log(`  Model: ${config.model}`);
      console.log(`  Endpoint: ${config.endpoint || 'NOT SET'}`);
      console.log(`  Updated: ${engine.updatedAt}`);
      console.log('');
    });
    
    // Test updating a provider
    if (aiEngines.length > 0) {
      const testProvider = aiEngines[0];
      console.log(`Testing update on: ${testProvider.name}`);
      
      const originalConfig = JSON.parse(testProvider.config);
      const testEndpoint = originalConfig.endpoint + '_TEST';
      
      // Update the endpoint
      const updatedProvider = await prisma.serviceProvider.update({
        where: { id: testProvider.id },
        data: {
          config: JSON.stringify({
            ...originalConfig,
            endpoint: testEndpoint
          })
        }
      });
      
      console.log('Update successful!');
      console.log('Original endpoint:', originalConfig.endpoint);
      console.log('New endpoint:', testEndpoint);
      
      // Verify the update
      const verifyProvider = await prisma.serviceProvider.findUnique({
        where: { id: testProvider.id }
      });
      
      const verifyConfig = JSON.parse(verifyProvider.config);
      console.log('Verified endpoint:', verifyConfig.endpoint);
      console.log('Update persisted:', verifyConfig.endpoint === testEndpoint);
      
      // Revert the change
      await prisma.serviceProvider.update({
        where: { id: testProvider.id },
        data: {
          config: JSON.stringify({
            ...originalConfig,
            endpoint: originalConfig.endpoint
          })
        }
      });
      
      console.log('Reverted change successfully');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testServicePersistence();
