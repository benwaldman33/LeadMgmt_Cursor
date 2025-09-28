const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
  try {
    console.log('=== SERVICE CONFIGURATION CHECK ===\n');
    
    // Check service providers
    const services = await prisma.serviceProvider.findMany({
      include: { operationMappings: true },
      orderBy: { priority: 'asc' }
    });
    
    console.log('Service Providers (ordered by priority):');
    services.forEach(s => {
      console.log(`- ${s.name} (Priority: ${s.priority}, Active: ${s.isActive}, Type: ${s.type})`);
      if (s.operationMappings.length > 0) {
        s.operationMappings.forEach(m => {
          console.log(`  - ${m.operation} (Priority: ${m.priority}, Enabled: ${m.isEnabled})`);
        });
      } else {
        console.log(`  - No operation mappings`);
      }
    });
    
    console.log('\n=== AI DISCOVERY OPERATION MAPPINGS ===');
    const aiDiscoveryMappings = await prisma.operationServiceMapping.findMany({
      where: { operation: 'AI_DISCOVERY' },
      include: { service: true },
      orderBy: { priority: 'asc' }
    });
    
    if (aiDiscoveryMappings.length === 0) {
      console.log('No AI_DISCOVERY operation mappings found!');
    } else {
      console.log('AI_DISCOVERY mappings (ordered by priority):');
      aiDiscoveryMappings.forEach(m => {
        console.log(`- ${m.service.name} (Service Priority: ${m.service.priority}, Mapping Priority: ${m.priority}, Enabled: ${m.isEnabled}, Service Active: ${m.service.isActive})`);
      });
    }
    
    console.log('\n=== SYSTEM CONFIG CHECK ===');
    const claudeConfig = await prisma.systemConfig.findMany({
      where: { 
        key: { 
          in: ['CLAUDE_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_ENDPOINT'] 
        } 
      }
    });
    
    claudeConfig.forEach(config => {
      console.log(`- ${config.key}: ${config.isEncrypted ? '[ENCRYPTED]' : config.value.substring(0, 20) + '...'}`);
    });
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig();
