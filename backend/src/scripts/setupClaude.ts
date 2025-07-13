import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupClaude() {
  console.log('🤖 Claude API Configuration Setup');
  console.log('================================\n');

  try {
    // Check if configuration already exists
    const existingConfig = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['CLAUDE_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_MAX_TOKENS']
        }
      }
    });

    if (existingConfig.length > 0) {
      console.log('⚠️  Claude configuration already exists:');
      existingConfig.forEach(config => {
        const value = config.isEncrypted ? '[ENCRYPTED]' : config.value;
        console.log(`  ${config.key}: ${value}`);
      });
      
      const update = await question('\nDo you want to update the configuration? (y/N): ');
      if (update.toLowerCase() !== 'y') {
        console.log('Configuration unchanged.');
        return;
      }
    }

    // Get API key
    console.log('\n📝 Claude API Configuration');
    console.log('You can get your API key from: https://console.anthropic.com/');
    const apiKey = await question('Enter your Claude API key: ');
    
    if (!apiKey.trim()) {
      console.log('❌ API key is required');
      return;
    }

    // Get model preference
    console.log('\n🤖 Available Claude Models:');
    console.log('1. claude-3-sonnet-20240229 (Recommended - Balanced)');
    console.log('2. claude-3-haiku-20240307 (Fast - Cost effective)');
    console.log('3. claude-3-opus-20240229 (Most capable - Expensive)');
    
    const modelChoice = await question('Select model (1-3, default: 1): ');
    let model = 'claude-3-sonnet-20240229';
    
    switch (modelChoice.trim()) {
      case '2':
        model = 'claude-3-haiku-20240307';
        break;
      case '3':
        model = 'claude-3-opus-20240229';
        break;
    }

    // Get max tokens
    const maxTokens = await question('Max tokens per request (default: 4000): ') || '4000';

    // Get admin user for configuration
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    // Save configurations
    const configs = [
      {
        key: 'CLAUDE_API_KEY',
        value: apiKey,
        description: 'Claude API Key for AI scoring',
        isEncrypted: true,
        category: 'AI',
        createdById: adminUser.id
      },
      {
        key: 'CLAUDE_MODEL',
        value: model,
        description: 'Claude model to use for AI scoring',
        isEncrypted: false,
        category: 'AI',
        createdById: adminUser.id
      },
      {
        key: 'CLAUDE_MAX_TOKENS',
        value: maxTokens,
        description: 'Maximum tokens per Claude request',
        isEncrypted: false,
        category: 'AI',
        createdById: adminUser.id
      }
    ];

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          description: config.description,
          isEncrypted: config.isEncrypted,
          category: config.category,
          updatedAt: new Date()
        },
        create: config
      });
    }

    console.log('\n✅ Claude configuration saved successfully!');
    console.log(`📊 Model: ${model}`);
    console.log(`🔢 Max Tokens: ${maxTokens}`);
    console.log('\n🧪 Testing connection...');

    // Test the connection
    const { AIScoringService } = await import('../services/aiScoringService');
    const aiService = new AIScoringService();
    
    try {
      const testResult = await aiService.testClaudeConnection();
      if (testResult.success) {
        console.log('✅ Claude API connection successful!');
        console.log(`⏱️  Response time: ${testResult.responseTime}ms`);
        if (testResult.details?.response) {
          console.log(`🤖 Response: ${testResult.details.response}`);
        }
      } else {
        console.log('❌ Claude API connection failed:');
        console.log(`   ${testResult.message}`);
      }
    } catch (error) {
      console.log('❌ Error testing Claude connection:', error);
    }

  } catch (error) {
    console.error('❌ Error setting up Claude configuration:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the setup
setupClaude().catch(console.error); 