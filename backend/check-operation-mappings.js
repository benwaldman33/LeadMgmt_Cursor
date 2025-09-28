const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function checkOperationMappings() {
  console.log('=== CHECKING ALL OPERATION MAPPINGS ===\n');
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');
    
    // Check all operation mappings
    console.log('=== ALL OPERATION MAPPINGS ===');
    const allMappings = await prisma.operationServiceMapping.findMany({
      include: { 
        service: true 
      },
      orderBy: [
        { operation: 'asc' },
        { priority: 'asc' }
      ]
    });
    
    console.log(`Found ${allMappings.length} total operation mappings:\n`);
    
    if (allMappings.length === 0) {
      console.log('❌ NO OPERATION MAPPINGS FOUND!');
      console.log('This explains why AI Discovery is using Fallback Analysis.');
      console.log('The service providers exist but are not mapped to any operations.\n');
    } else {
      const operations = {};
      allMappings.forEach(mapping => {
        if (!operations[mapping.operation]) {
          operations[mapping.operation] = [];
        }
        operations[mapping.operation].push(mapping);
      });
      
      Object.keys(operations).forEach(operation => {
        console.log(`${operation}:`);
        operations[operation].forEach((mapping, index) => {
          console.log(`  ${index + 1}. ${mapping.service.name} (Priority: ${mapping.priority}, Enabled: ${mapping.isEnabled})`);
        });
        console.log('');
      });
    }
    
    // Check specifically for AI_DISCOVERY mappings
    console.log('=== AI_DISCOVERY OPERATION MAPPINGS ===');
    const aiDiscoveryMappings = await prisma.operationServiceMapping.findMany({
      where: { 
        operation: 'AI_DISCOVERY'
      },
      include: { 
        service: true 
      },
      orderBy: { priority: 'asc' }
    });
    
    console.log(`Found ${aiDiscoveryMappings.length} AI_DISCOVERY mappings:\n`);
    
    if (aiDiscoveryMappings.length === 0) {
      console.log('❌ NO AI_DISCOVERY MAPPINGS FOUND!');
      console.log('This is the root cause of the problem.');
      console.log('The AI Discovery service cannot find any services to use.\n');
    } else {
      aiDiscoveryMappings.forEach((mapping, index) => {
        const service = mapping.service;
        console.log(`${index + 1}. ${service.name} (Priority: ${mapping.priority}, Enabled: ${mapping.isEnabled})`);
        console.log(`   Type: ${service.type}`);
        console.log(`   Active: ${service.isActive}`);
        
        // Parse the configuration
        try {
          const config = JSON.parse(service.config);
          console.log(`   API Key: ${config.apiKey ? config.apiKey.substring(0, 20) + '...' : 'MISSING'}`);
          console.log(`   Model: ${config.model || 'NOT SET'}`);
        } catch (error) {
          console.log(`   Configuration parsing error: ${error.message}`);
        }
        console.log('');
      });
    }
    
    console.log('=== SUMMARY ===');
    if (allMappings.length === 0) {
      console.log('❌ CRITICAL ISSUE: No operation mappings exist!');
      console.log('The database needs to be seeded with operation mappings.');
      console.log('This is why AI Discovery falls back to "Fallback Analysis".');
    } else if (aiDiscoveryMappings.length === 0) {
      console.log('❌ ISSUE: No AI_DISCOVERY operation mappings exist!');
      console.log('The service providers exist but are not mapped to AI_DISCOVERY.');
      console.log('This is why AI Discovery falls back to "Fallback Analysis".');
    } else {
      console.log('✅ Operation mappings exist and should be working.');
    }
    
  } catch (error) {
    console.error('Error checking operation mappings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationMappings().then(() => {
  console.log('\n=== OPERATION MAPPINGS CHECK COMPLETE ===');
}).catch(console.error);
