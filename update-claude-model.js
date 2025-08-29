const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const NEW_MODEL_NAME = 'claude-sonnet-4-20250514';

async function updateClaudeModel() {
  try {
    console.log('=== Updating Claude Model Configuration ===\n');
    
    // First, check if the model config already exists
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { key: 'CLAUDE_MODEL' }
    });
    
    if (existingConfig) {
      console.log('Found existing CLAUDE_MODEL configuration:');
      console.log(`- Current value: ${existingConfig.value}`);
      console.log(`- Last updated: ${existingConfig.updatedAt}`);
      
      // Update the existing config
      const updatedConfig = await prisma.systemConfig.update({
        where: { key: 'CLAUDE_MODEL' },
        data: { 
          value: NEW_MODEL_NAME,
          updatedAt: new Date()
        }
      });
      
      console.log('\n✅ CLAUDE_MODEL updated successfully!');
      console.log(`- New value: ${updatedConfig.value}`);
      console.log(`- Updated at: ${updatedConfig.updatedAt}`);
      
    } else {
      console.log('No existing CLAUDE_MODEL found, creating new configuration...');
      
      // Create new config
      const newConfig = await prisma.systemConfig.create({
        data: {
          key: 'CLAUDE_MODEL',
          value: NEW_MODEL_NAME,
          description: 'Claude AI model to use for AI operations',
          isEncrypted: false,
          category: 'AI_CONFIGURATION'
        }
      });
      
      console.log('\n✅ CLAUDE_MODEL created successfully!');
      console.log(`- Value: ${newConfig.value}`);
      console.log(`- Created at: ${newConfig.createdAt}`);
    }
    
    // Verify the update
    console.log('\n=== Verification ===');
    const verifyConfig = await prisma.systemConfig.findUnique({
      where: { key: 'CLAUDE_MODEL' }
    });
    
    if (verifyConfig) {
      console.log(`✅ Verification successful: CLAUDE_MODEL = ${verifyConfig.value}`);
    } else {
      console.log('❌ Verification failed: CLAUDE_MODEL not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating Claude model:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateClaudeModel().then(() => {
  console.log('\n✨ Update completed!');
}).catch(error => {
  console.error('\n💥 Update failed:', error);
});
