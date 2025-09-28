const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDynamicAI() {
  try {
    console.log('=== TESTING DYNAMIC AI ENGINE SELECTION ===');
    
    // Check what AI engines are configured
    const aiEngines = await prisma.serviceProvider.findMany({
      where: { 
        type: 'AI_ENGINE',
        isActive: true
      },
      orderBy: { priority: 'asc' }
    });
    
    console.log('Found AI engines:', aiEngines.length);
    aiEngines.forEach(engine => {
      const config = JSON.parse(engine.config);
      const capabilities = JSON.parse(engine.capabilities);
      console.log(`- ${engine.name} (Priority: ${engine.priority})`);
      console.log(`  Type: ${engine.type}`);
      console.log(`  API Key length: ${config.apiKey?.length || 0}`);
      console.log(`  Model: ${config.model}`);
      console.log(`  Endpoint: ${config.endpoint || 'NOT SET'}`);
      console.log(`  Capabilities: ${capabilities.join(', ')}`);
      console.log('');
    });
    
    // Check operation mappings
    const mappings = await prisma.operationServiceMapping.findMany({
      where: { 
        operation: 'AI_DISCOVERY',
        isEnabled: true
      },
      include: { service: true },
      orderBy: { priority: 'asc' }
    });
    
    console.log('AI_DISCOVERY operation mappings:', mappings.length);
    mappings.forEach(mapping => {
      console.log(`- ${mapping.service.name} (Priority: ${mapping.priority})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDynamicAI();
