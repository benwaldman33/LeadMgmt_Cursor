const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSystemConfig() {
  try {
    console.log('Checking system configuration...');
    
    const configs = await prisma.systemConfig.findMany();
    console.log('Found system configs:', configs.length);
    
    configs.forEach(config => {
      console.log(`\nKey: ${config.key}`);
      console.log(`Value: ${config.isEncrypted ? '[ENCRYPTED]' : config.value}`);
      console.log(`Encrypted: ${config.isEncrypted}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemConfig();
