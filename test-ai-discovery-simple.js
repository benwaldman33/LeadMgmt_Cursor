const { PrismaClient } = require('@prisma/client');

async function testAIServiceSelection() {
  console.log('=== TESTING AI SERVICE SELECTION ===\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Check what services are available
    console.log('1. Checking all service providers...');
    const allServices = await prisma.serviceProvider.findMany({
      orderBy: { priority: 'asc' }
    });
    
    console.log(`Found ${allServices.length} total service providers:`);
    allServices.forEach((service, index) => {
      console.log(`  ${index + 1}. ${service.name} (Type: ${service.type}, Priority: ${service.priority}, Active: ${service.isActive})`);
    });
    
    // Check AI_DISCOVERY operation mappings
    console.log('\n2. Checking AI_DISCOVERY operation mappings...');
    const aiDiscoveryMappings = await prisma.operationServiceMapping.findMany({
      where: { operation: 'AI_DISCOVERY' },
      include: { service: true },
      orderBy: { priority: 'asc' }
    });
    
    if (aiDiscoveryMappings.length === 0) {
      console.log('❌ No AI_DISCOVERY operation mappings found!');
    } else {
      console.log(`Found ${aiDiscoveryMappings.length} AI_DISCOVERY mappings:`);
      aiDiscoveryMappings.forEach((mapping, index) => {
        console.log(`  ${index + 1}. ${mapping.service.name} (Service Priority: ${mapping.service.priority}, Mapping Priority: ${mapping.priority}, Enabled: ${mapping.isEnabled}, Service Active: ${mapping.service.isActive})`);
      });
    }
    
    // Check all operation mappings
    console.log('\n3. Checking all operation mappings...');
    const allMappings = await prisma.operationServiceMapping.findMany({
      include: { service: true },
      orderBy: [{ operation: 'asc' }, { priority: 'asc' }]
    });
    
    console.log(`Found ${allMappings.length} total operation mappings:`);
    const operations = {};
    allMappings.forEach(mapping => {
      if (!operations[mapping.operation]) {
        operations[mapping.operation] = [];
      }
      operations[mapping.operation].push(mapping);
    });
    
    Object.keys(operations).forEach(operation => {
      console.log(`  ${operation}: ${operations[operation].length} mappings`);
      operations[operation].forEach(mapping => {
        console.log(`    - ${mapping.service.name} (Priority: ${mapping.priority}, Enabled: ${mapping.isEnabled})`);
      });
    });
    
    // Check system config for Claude
    console.log('\n4. Checking Claude system configuration...');
    const claudeConfig = await prisma.systemConfig.findMany({
      where: { 
        key: { 
          in: ['CLAUDE_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_ENDPOINT'] 
        } 
      }
    });
    
    if (claudeConfig.length === 0) {
      console.log('❌ No Claude configuration found in system config!');
    } else {
      console.log(`Found ${claudeConfig.length} Claude config entries:`);
      claudeConfig.forEach(config => {
        console.log(`  - ${config.key}: ${config.isEncrypted ? '[ENCRYPTED]' : config.value.substring(0, 20) + '...'}`);
      });
    }
    
    console.log('\n=== ANALYSIS ===');
    
    if (aiDiscoveryMappings.length === 0) {
      console.log('❌ PROBLEM: No AI_DISCOVERY operation mappings found!');
      console.log('   SOLUTION: You need to create operation mappings for AI_DISCOVERY');
    } else {
      const activeMappings = aiDiscoveryMappings.filter(m => m.isEnabled && m.service.isActive);
      if (activeMappings.length === 0) {
        console.log('❌ PROBLEM: No active AI_DISCOVERY mappings found!');
        console.log('   SOLUTION: Enable some AI_DISCOVERY mappings or activate the services');
      } else {
        console.log(`✅ Found ${activeMappings.length} active AI_DISCOVERY mappings`);
        console.log('   Priority order:');
        activeMappings.forEach((mapping, index) => {
          console.log(`   ${index + 1}. ${mapping.service.name} (Priority: ${mapping.priority})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAIServiceSelection();
