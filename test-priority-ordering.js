const { PrismaClient } = require('@prisma/client');

async function testPriorityOrdering() {
  console.log('🧪 Testing Priority Ordering Fix...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Check current ServiceProvider priorities
    console.log('1. Current ServiceProvider priorities:');
    const providers = await prisma.serviceProvider.findMany({
      orderBy: { priority: 'asc' }
    });
    
    providers.forEach(provider => {
      console.log(`   - ${provider.name}: Priority ${provider.priority}`);
    });
    console.log('');
    
    // 2. Check current OperationServiceMapping priorities for AI_DISCOVERY
    console.log('2. Current OperationServiceMapping priorities for AI_DISCOVERY:');
    const mappings = await prisma.operationServiceMapping.findMany({
      where: { operation: 'AI_DISCOVERY' },
      include: { service: true },
      orderBy: [
        { service: { priority: 'asc' } }, // ServiceProvider priority FIRST
        { priority: 'asc' }               // OperationServiceMapping priority SECOND
      ]
    });
    
    mappings.forEach(mapping => {
      console.log(`   - ${mapping.service.name}: ServiceProvider Priority ${mapping.service.priority}, Mapping Priority ${mapping.priority}`);
    });
    console.log('');
    
    // 3. Test what the AI Discovery service would see
    console.log('3. What AI Discovery service would see (after fix):');
    const availableServices = mappings.map(mapping => mapping.service);
    availableServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} (Priority: ${service.priority})`);
    });
    console.log('');
    
    // 4. Show the expected order
    console.log('4. Expected order (ServiceProvider priority first):');
    const expectedOrder = providers
      .filter(provider => 
        mappings.some(mapping => 
          mapping.serviceId === provider.id && 
          mapping.operation === 'AI_DISCOVERY' &&
          mapping.isEnabled &&
          provider.isActive
        )
      )
      .sort((a, b) => a.priority - b.priority);
    
    expectedOrder.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name} (Priority: ${service.priority})`);
    });
    
    console.log('\n✅ Priority ordering test completed!');
    console.log('📝 The AI Discovery service should now use ServiceProvider priorities as the primary ordering.');
    
  } catch (error) {
    console.error('❌ Error testing priority ordering:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPriorityOrdering();
