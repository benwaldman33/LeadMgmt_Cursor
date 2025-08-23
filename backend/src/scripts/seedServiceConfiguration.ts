import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedServiceConfiguration() {
  console.log('🌱 Seeding service configuration...');

  try {
    // Create default service providers
    const providers = [
      {
        name: 'Claude AI',
        type: 'AI_ENGINE',
        capabilities: JSON.stringify([
          'AI_DISCOVERY',
          'MARKET_DISCOVERY',
          'KEYWORD_EXTRACTION',
          'CONTENT_ANALYSIS',
          'LEAD_SCORING'
        ]),
        config: JSON.stringify({
          apiKey: process.env.CLAUDE_API_KEY || 'your-claude-api-key',
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 4096,
          temperature: 0.7
        }),
        limits: JSON.stringify({
          monthlyQuota: 1000,
          concurrentRequests: 5,
          costPerRequest: 0.015
        }),
        scrapingConfig: null
      },
      {
        name: 'OpenAI GPT-4',
        type: 'AI_ENGINE',
        capabilities: JSON.stringify([
          'AI_DISCOVERY',
          'MARKET_DISCOVERY',
          'KEYWORD_EXTRACTION',
          'CONTENT_ANALYSIS',
          'LEAD_SCORING'
        ]),
        config: JSON.stringify({
          apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
          model: 'gpt-4',
          maxTokens: 4096,
          temperature: 0.7
        }),
        limits: JSON.stringify({
          monthlyQuota: 500,
          concurrentRequests: 3,
          costPerRequest: 0.03
        }),
        scrapingConfig: null
      },
      {
        name: 'Apify Web Scraper',
        type: 'SCRAPER',
        capabilities: JSON.stringify([
          'WEB_SCRAPING',
          'SITE_ANALYSIS'
        ]),
        config: JSON.stringify({
          apiToken: process.env.APIFY_API_TOKEN || 'your-apify-api-token',
          defaultActor: 'apify/web-scraper',
          maxConcurrency: 10
        }),
        limits: JSON.stringify({
          monthlyQuota: 10000,
          concurrentRequests: 10,
          costPerRequest: 0.001
        }),
        scrapingConfig: JSON.stringify({
          maxDepth: 3,
          maxPages: 100,
          respectRobotsTxt: true,
          requestDelay: 1000
        })
      },
      {
        name: 'Custom Site Analyzer',
        type: 'SITE_ANALYZER',
        capabilities: JSON.stringify([
          'SITE_ANALYSIS',
          'KEYWORD_EXTRACTION'
        ]),
        config: JSON.stringify({
          maxConcurrency: 5,
          timeout: 30000,
          userAgent: 'BBDS-Site-Analyzer/1.0'
        }),
        limits: JSON.stringify({
          monthlyQuota: 5000,
          concurrentRequests: 5,
          costPerRequest: 0.0001
        }),
        scrapingConfig: JSON.stringify({
          maxDepth: 5,
          maxPages: 500,
          includeImages: false,
          includePdfs: true,
          keywordExtraction: true
        })
      },
      {
        name: 'Lead Scoring AI',
        type: 'CONTENT_ANALYZER',
        capabilities: JSON.stringify([
          'LEAD_SCORING',
          'CONTENT_ANALYSIS'
        ]),
        config: JSON.stringify({
          scoringModel: 'default',
          confidenceThreshold: 0.7,
          maxAnalysisTime: 30000
        }),
        limits: JSON.stringify({
          monthlyQuota: 2000,
          concurrentRequests: 8,
          costPerRequest: 0.005
        }),
        scrapingConfig: null
      }
    ];

    // Create service providers
    for (const providerData of providers) {
      const existingProvider = await prisma.serviceProvider.findFirst({
        where: { name: providerData.name }
      });

      if (!existingProvider) {
        const provider = await prisma.serviceProvider.create({
          data: providerData
        });
        console.log(`✅ Created service provider: ${provider.name}`);
      } else {
        console.log(`⏭️  Service provider already exists: ${providerData.name}`);
      }
    }

    // Create operation-service mappings
    const mappings = [
      // AI Discovery
      { operation: 'AI_DISCOVERY', serviceName: 'Claude AI', priority: 1 },
      { operation: 'AI_DISCOVERY', serviceName: 'OpenAI GPT-4', priority: 2 },
      
      // Market Discovery
      { operation: 'MARKET_DISCOVERY', serviceName: 'Claude AI', priority: 1 },
      { operation: 'MARKET_DISCOVERY', serviceName: 'OpenAI GPT-4', priority: 2 },
      
      // Web Scraping
      { operation: 'WEB_SCRAPING', serviceName: 'Apify Web Scraper', priority: 1 },
      { operation: 'WEB_SCRAPING', serviceName: 'Custom Site Analyzer', priority: 2 },
      
      // Site Analysis
      { operation: 'SITE_ANALYSIS', serviceName: 'Custom Site Analyzer', priority: 1 },
      { operation: 'SITE_ANALYSIS', serviceName: 'Apify Web Scraper', priority: 2 },
      
      // Keyword Extraction
      { operation: 'KEYWORD_EXTRACTION', serviceName: 'Claude AI', priority: 1 },
      { operation: 'KEYWORD_EXTRACTION', serviceName: 'OpenAI GPT-4', priority: 2 },
      
      // Lead Scoring
      { operation: 'LEAD_SCORING', serviceName: 'Lead Scoring AI', priority: 1 },
      { operation: 'LEAD_SCORING', serviceName: 'Claude AI', priority: 2 },
      
      // Content Analysis
      { operation: 'CONTENT_ANALYSIS', serviceName: 'Claude AI', priority: 1 },
      { operation: 'CONTENT_ANALYSIS', serviceName: 'OpenAI GPT-4', priority: 2 }
    ];

    for (const mappingData of mappings) {
      const service = await prisma.serviceProvider.findFirst({
        where: { name: mappingData.serviceName }
      });

      if (service) {
        const existingMapping = await prisma.operationServiceMapping.findFirst({
          where: {
            operation: mappingData.operation,
            serviceId: service.id
          }
        });

        if (!existingMapping) {
          await prisma.operationServiceMapping.create({
            data: {
              operation: mappingData.operation,
              serviceId: service.id,
              isEnabled: true,
              priority: mappingData.priority,
              config: '{}'
            }
          });
          console.log(`✅ Created mapping: ${mappingData.operation} → ${mappingData.serviceName}`);
        } else {
          console.log(`⏭️  Mapping already exists: ${mappingData.operation} → ${mappingData.serviceName}`);
        }
      }
    }

    console.log('🎉 Service configuration seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding service configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedServiceConfiguration();
}

export default seedServiceConfiguration;
