const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkServiceConfig() {
  try {
    console.log('Checking service configuration...');
    
    const configs = await prisma.serviceConfiguration.findMany();
    console.log('Found service configurations:', configs.length);
    
    configs.forEach(config => {
      console.log(`\nService: ${config.serviceName}`);
      console.log(`Type: ${config.type}`);
      console.log(`Config: ${config.config}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceConfig();
