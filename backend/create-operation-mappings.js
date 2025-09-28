const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function createOperationMappings() {
  console.log('=== CREATING MISSING OPERATION MAPPINGS ===\n');
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');
    
    // Get all service providers
    const serviceProviders = await prisma.serviceProvider.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${serviceProviders.length} active service providers:\n`);
    serviceProviders.forEach(provider => {
      console.log(`- ${provider.name} (${provider.type})`);
    });
    console.log('');
    
    // Define the mappings we want to create
    const mappings = [
      // AI Discovery mappings
      { operation: 'AI_DISCOVERY', serviceName: 'Claude', priority: 1 },
      { operation: 'AI_DISCOVERY', serviceName: 'Open AI', priority: 2 },
      { operation: 'AI_DISCOVERY', serviceName: 'Grok', priority: 3 },
      
      // Market Discovery mappings
      { operation: 'MARKET_DISCOVERY', serviceName: 'Claude', priority: 1 },
      { operation: 'MARKET_DISCOVERY', serviceName: 'Open AI', priority: 2 },
      { operation: 'MARKET_DISCOVERY', serviceName: 'Grok', priority: 3 },
      
      // Lead Scoring mappings
      { operation: 'LEAD_SCORING', serviceName: 'Claude', priority: 1 },
      { operation: 'LEAD_SCORING', serviceName: 'Open AI', priority: 2 },
      { operation: 'LEAD_SCORING', serviceName: 'Grok', priority: 3 }
    ];
    
    console.log('Creating operation mappings...\n');
    
    for (const mappingData of mappings) {
      const service = serviceProviders.find(s => s.name === mappingData.serviceName);
      
      if (service) {
        // Check if mapping already exists
        const existingMapping = await prisma.operationServiceMapping.findFirst({
          where: {
            operation: mappingData.operation,
            serviceId: service.id
          }
        });
        
        if (!existingMapping) {
          await prisma.operationServiceMapping.create({
            data: {
              operation: mappingData.operation,
              serviceId: service.id,
              isEnabled: true,
              priority: mappingData.priority,
              config: '{}'
            }
          });
          console.log(`✅ Created mapping: ${mappingData.operation} → ${mappingData.serviceName} (Priority: ${mappingData.priority})`);
        } else {
          console.log(`⏭️  Mapping already exists: ${mappingData.operation} → ${mappingData.serviceName}`);
        }
      } else {
        console.log(`❌ Service not found: ${mappingData.serviceName}`);
      }
    }
    
    // Verify the mappings were created
    console.log('\n=== VERIFYING CREATED MAPPINGS ===');
    const aiDiscoveryMappings = await prisma.operationServiceMapping.findMany({
      where: { operation: 'AI_DISCOVERY' },
      include: { service: true },
      orderBy: { priority: 'asc' }
    });
    
    console.log(`Found ${aiDiscoveryMappings.length} AI_DISCOVERY mappings:\n`);
    aiDiscoveryMappings.forEach((mapping, index) => {
      console.log(`${index + 1}. ${mapping.service.name} (Priority: ${mapping.priority}, Enabled: ${mapping.isEnabled})`);
    });
    
    console.log('\n=== SUMMARY ===');
    if (aiDiscoveryMappings.length > 0) {
      console.log('✅ AI_DISCOVERY operation mappings created successfully!');
      console.log('The AI Discovery service should now be able to find and use the AI engines.');
      console.log('Try running AI Discovery again - it should no longer use "Fallback Analysis".');
    } else {
      console.log('❌ No AI_DISCOVERY mappings were created.');
    }
    
  } catch (error) {
    console.error('Error creating operation mappings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOperationMappings().then(() => {
  console.log('\n=== OPERATION MAPPINGS CREATION COMPLETE ===');
}).catch(console.error);
