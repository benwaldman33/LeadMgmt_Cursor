const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseConfig() {
  try {
    console.log('=== Checking Database Configuration ===\n');
    
    // Check service providers
    const services = await prisma.serviceProvider.findMany();
    console.log('Service Providers:', services.length);
    services.forEach(s => {
      console.log(`  - ${s.name} (${s.type}) - Active: ${s.isActive}, Priority: ${s.priority}`);
    });
    
    // Check operation mappings
    const mappings = await prisma.operationServiceMapping.findMany({
      include: { service: true }
    });
    console.log('\nOperation Mappings:', mappings.length);
    mappings.forEach(m => {
      console.log(`  - ${m.operation} -> ${m.service.name} (Enabled: ${m.isEnabled})`);
    });
    
    // Check Claude configuration
    const claudeConfig = await prisma.systemConfig.findMany({
      where: { 
        key: { contains: 'CLAUDE' } 
      }
    });
    console.log('\nClaude Configuration:', claudeConfig.length);
    claudeConfig.forEach(c => {
      console.log(`  - ${c.key}: ${c.isEncrypted ? '[ENCRYPTED]' : c.value.substring(0, 50)}...`);
    });
    
    // Check for any AI-related operations
    const aiOperations = await prisma.operationServiceMapping.findMany({
      where: {
        operation: { contains: 'AI' }
      },
      include: { service: true }
    });
    console.log('\nAI-related Operations:', aiOperations.length);
    aiOperations.forEach(op => {
      console.log(`  - ${op.operation} -> ${op.service.name}`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseConfig();
