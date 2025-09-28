const { PrismaClient } = require('@prisma/client');

async function testPrioritySync() {
  console.log('🧪 Testing Priority Synchronization Logic...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Check current state
    console.log('1. Current ServiceProvider priorities:');
    const providers = await prisma.serviceProvider.findMany({
      orderBy: { priority: 'asc' }
    });
    
    providers.forEach(provider => {
      console.log(`   - ${provider.name}: Priority ${provider.priority}`);
    });
    console.log('');
    
    // 2. Check current OperationServiceMapping priorities
    console.log('2. Current OperationServiceMapping priorities:');
    const mappings = await prisma.operationServiceMapping.findMany({
      include: { service: true },
      orderBy: [
        { service: { priority: 'asc' } },
        { priority: 'asc' }
      ]
    });
    
    mappings.forEach(mapping => {
      console.log(`   - ${mapping.service.name} -> ${mapping.operation}: ServiceProvider Priority ${mapping.service.priority}, Mapping Priority ${mapping.priority}`);
    });
    console.log('');
    
    // 3. Test the synchronization logic by updating a provider priority
    if (providers.length > 0) {
      const testProvider = providers[0];
      const newPriority = testProvider.priority === 1 ? 5 : 1;
      
      console.log(`3. Testing priority synchronization:`);
      console.log(`   - Updating ${testProvider.name} priority from ${testProvider.priority} to ${newPriority}`);
      
      // Update the provider priority
      await prisma.serviceProvider.update({
        where: { id: testProvider.id },
        data: { priority: newPriority }
      });
      
      console.log(`   ✅ Provider priority updated`);
      
      // Check if OperationServiceMapping priorities were synced
      console.log(`4. Checking if OperationServiceMapping priorities were synced:`);
      const updatedMappings = await prisma.operationServiceMapping.findMany({
        where: { serviceId: testProvider.id },
        include: { service: true }
      });
      
      updatedMappings.forEach(mapping => {
        const isSynced = mapping.priority === newPriority;
        console.log(`   - ${mapping.service.name} -> ${mapping.operation}: Priority ${mapping.priority} ${isSynced ? '✅ SYNCED' : '❌ NOT SYNCED'}`);
      });
      
      // Revert the change for testing
      await prisma.serviceProvider.update({
        where: { id: testProvider.id },
        data: { priority: testProvider.priority }
      });
      
      console.log(`   🔄 Reverted priority back to ${testProvider.priority}`);
    }
    
    console.log('\n✅ Priority synchronization test completed!');
    console.log('📝 The system should now automatically sync OperationServiceMapping priorities when ServiceProvider priorities change.');
    
  } catch (error) {
    console.error('❌ Error testing priority synchronization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrioritySync();
