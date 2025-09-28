const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkClaudeConfig() {
  try {
    console.log('=== CHECKING CLAUDE DATABASE CONFIG ===');
    
    const provider = await prisma.serviceProvider.findFirst({
      where: { 
        name: 'Claude', 
        type: 'AI_ENGINE' 
      }
    });
    
    console.log('Found Claude provider:', !!provider);
    
    if (provider) {
      const config = JSON.parse(provider.config);
      console.log('API Key length:', config.apiKey?.length || 0);
      console.log('Model:', config.model);
      console.log('Endpoint:', config.endpoint || 'NOT SET');
      console.log('Full config keys:', Object.keys(config));
      console.log('Is API key encrypted:', config.apiKey?.startsWith('encrypted:'));
    } else {
      console.log('No Claude provider found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClaudeConfig();
