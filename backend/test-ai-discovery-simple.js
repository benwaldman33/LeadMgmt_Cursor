const { PrismaClient } = require('@prisma/client');

// Test the configuration functions directly
async function testConfigFunctions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Testing Configuration Functions ===\n');
    
    // Test getting Claude config
    const claudeConfig = await prisma.systemConfig.findMany({
      where: { 
        key: { contains: 'CLAUDE' } 
      }
    });
    
    console.log('Claude Configuration found:', claudeConfig.length);
    claudeConfig.forEach(c => {
      console.log(`  - ${c.key}: ${c.isEncrypted ? '[ENCRYPTED]' : c.value.substring(0, 50)}...`);
    });
    
    // Test getting a specific config
    const apiKeyConfig = await prisma.systemConfig.findUnique({
      where: { key: 'CLAUDE_API_KEY' }
    });
    
    if (apiKeyConfig) {
      console.log('\nAPI Key Config Details:');
      console.log('  - Key:', apiKeyConfig.key);
      console.log('  - Is Encrypted:', apiKeyConfig.isEncrypted);
      console.log('  - Value Length:', apiKeyConfig.value ? apiKeyConfig.value.length : 0);
      console.log('  - Value Preview:', apiKeyConfig.value ? apiKeyConfig.value.substring(0, 30) + '...' : 'none');
    } else {
      console.log('\nNo CLAUDE_API_KEY config found!');
    }
    
  } catch (error) {
    console.error('Error testing config:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConfigFunctions();
