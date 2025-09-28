import { PrismaClient } from '@prisma/client';
import APIKeyService from '../services/apiKeyService';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MigrationConfig {
  serviceName: string;
  serviceType: string;
  oldConfigKeys: string[];
  defaultCapabilities: string[];
  defaultLimits?: any;
}

const migrationConfigs: MigrationConfig[] = [
  {
    serviceName: 'Claude',
    serviceType: 'AI_ENGINE',
    oldConfigKeys: ['CLAUDE_API_KEY', 'Claude_API_Key'],
    defaultCapabilities: ['AI_DISCOVERY', 'MARKET_DISCOVERY', 'KEYWORD_EXTRACTION', 'CONTENT_ANALYSIS', 'LEAD_SCORING'],
    defaultLimits: {
      monthlyQuota: 1000,
      concurrentRequests: 5,
      costPerRequest: 0.03
    }
  },
  {
    serviceName: 'OpenAI',
    serviceType: 'AI_ENGINE',
    oldConfigKeys: ['OPENAI_API_KEY'],
    defaultCapabilities: ['AI_DISCOVERY', 'MARKET_DISCOVERY', 'KEYWORD_EXTRACTION', 'CONTENT_ANALYSIS', 'LEAD_SCORING'],
    defaultLimits: {
      monthlyQuota: 1000,
      concurrentRequests: 5,
      costPerRequest: 0.03
    }
  },
  {
    serviceName: 'Apify',
    serviceType: 'SCRAPER',
    oldConfigKeys: ['APIFY_API_KEY', 'APIFY_API_TOKEN'],
    defaultCapabilities: ['WEB_SCRAPING', 'SITE_ANALYSIS'],
    defaultLimits: {
      monthlyQuota: 1000,
      concurrentRequests: 10,
      costPerRequest: 0.01
    }
  }
];

async function migrateApiKeys() {
  console.log('🚀 Starting API Key Migration...');
  
  try {
    // Step 1: Check for existing API keys in system config
    console.log('\n📋 Checking for existing API keys in system configuration...');
    
    for (const config of migrationConfigs) {
      console.log(`\n🔍 Checking for ${config.serviceName} (${config.serviceType})...`);
      
      // Look for API keys in system config
      const existingConfig = await prisma.systemConfig.findFirst({
        where: {
          key: { in: config.oldConfigKeys }
        }
      });
      
      if (existingConfig) {
        console.log(`✅ Found existing ${config.serviceName} API key in system config`);
        
        // Check if already migrated to new system
        const existingService = await prisma.serviceProvider.findFirst({
          where: {
            name: config.serviceName,
            type: config.serviceType
          }
        });
        
        if (existingService) {
          console.log(`⚠️  ${config.serviceName} already exists in new system, skipping...`);
          continue;
        }
        
        // Migrate to new system
        console.log(`🔄 Migrating ${config.serviceName} to new API key system...`);
        
        const apiKeyConfig = {
          apiKey: existingConfig.value,
          model: config.serviceType === 'AI_ENGINE' ? 'claude-sonnet-4-20250514' : undefined,
          maxTokens: config.serviceType === 'AI_ENGINE' ? 4096 : undefined,
          temperature: config.serviceType === 'AI_ENGINE' ? 0.7 : undefined
        };
        
        await APIKeyService.storeAPIKey(
          config.serviceName,
          config.serviceType,
          apiKeyConfig,
          config.defaultCapabilities,
          config.defaultLimits
        );
        
        console.log(`✅ Successfully migrated ${config.serviceName} to new system`);
      } else {
        console.log(`❌ No existing ${config.serviceName} API key found`);
      }
    }
    
    // Step 2: Generate environment file template
    console.log('\n📝 Generating environment file template...');
    await generateEnvTemplate();
    
    // Step 3: Show migration summary
    console.log('\n📊 Migration Summary:');
    await showMigrationSummary();
    
    console.log('\n✅ API Key Migration Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the generated env.example to .env');
    console.log('2. Add your actual API keys to the .env file');
    console.log('3. Restart the application');
    console.log('4. The system will now use environment variables first, then database as fallback');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateEnvTemplate() {
  const envTemplate = `# API Keys Configuration
# Copy this file to .env and add your actual API keys

# Claude AI Configuration
AI_ENGINE_CLAUDE_API_KEY="your-claude-api-key-here"
AI_ENGINE_CLAUDE_MODEL="claude-sonnet-4-20250514"
AI_ENGINE_CLAUDE_MAX_TOKENS="4096"
AI_ENGINE_CLAUDE_TEMPERATURE="0.7"
AI_ENGINE_CLAUDE_CAPABILITIES='["AI_DISCOVERY", "MARKET_DISCOVERY", "KEYWORD_EXTRACTION", "CONTENT_ANALYSIS", "LEAD_SCORING"]'
AI_ENGINE_CLAUDE_MONTHLY_QUOTA="1000"
AI_ENGINE_CLAUDE_CONCURRENT_REQUESTS="5"
AI_ENGINE_CLAUDE_COST_PER_REQUEST="0.03"

# OpenAI Configuration (if using GPT models)
AI_ENGINE_OPENAI_API_KEY="your-openai-api-key-here"
AI_ENGINE_OPENAI_MODEL="gpt-4"
AI_ENGINE_OPENAI_MAX_TOKENS="4096"
AI_ENGINE_OPENAI_TEMPERATURE="0.7"
AI_ENGINE_OPENAI_BASE_URL="https://api.openai.com/v1"
AI_ENGINE_OPENAI_CAPABILITIES='["AI_DISCOVERY", "MARKET_DISCOVERY", "KEYWORD_EXTRACTION", "CONTENT_ANALYSIS", "LEAD_SCORING"]'

# Apify Scraper Configuration
SCRAPER_APIFY_API_KEY="your-apify-api-token-here"
SCRAPER_APIFY_BASE_URL="https://api.apify.com/v2"
SCRAPER_APIFY_MAX_CONCURRENCY="10"
SCRAPER_APIFY_CAPABILITIES='["WEB_SCRAPING", "SITE_ANALYSIS"]'
SCRAPER_APIFY_MONTHLY_QUOTA="1000"
SCRAPER_APIFY_CONCURRENT_REQUESTS="10"
SCRAPER_APIFY_COST_PER_REQUEST="0.01"

# Other Configuration
ENCRYPTION_KEY="your-32-character-encryption-key-here"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
DATABASE_URL="postgresql://postgres:password@postgres:5432/leadmgmt"
REDIS_URL="redis://redis:6379"
`;

  const envPath = path.join(__dirname, '..', '..', 'env.example');
  fs.writeFileSync(envPath, envTemplate);
  console.log(`✅ Environment template generated: ${envPath}`);
}

async function showMigrationSummary() {
  console.log('\n📊 Current API Key Status:');
  
  // Check environment variables
  const envServices = await APIKeyService.getAllServices();
  
  if (envServices.length === 0) {
    console.log('❌ No API keys found in environment variables');
  } else {
    console.log(`✅ Found ${envServices.length} services configured:`);
    envServices.forEach(service => {
      console.log(`   - ${service.name} (${service.type})`);
    });
  }
  
  // Check database
  const dbServices = await prisma.serviceProvider.findMany({
    where: { isActive: true }
  });
  
  if (dbServices.length === 0) {
    console.log('❌ No API keys found in database');
  } else {
    console.log(`✅ Found ${dbServices.length} services in database:`);
    dbServices.forEach(service => {
      console.log(`   - ${service.name} (${service.type})`);
    });
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateApiKeys()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateApiKeys };
