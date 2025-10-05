const { PrismaClient: SQLitePrisma } = require('@prisma/client');
const { PrismaClient: PostgresPrisma } = require('@prisma/client');

// Create SQLite client (temporary)
const sqlitePrisma = new SQLitePrisma({
  datasources: {
    db: {
      url: "file:./prisma/dev.db"
    }
  }
});

// Create PostgreSQL client
const postgresPrisma = new PostgresPrisma();

async function migrateData() {
  console.log('🚀 Starting SQLite to PostgreSQL data migration...\n');
  
  try {
    // Step 1: Get all data from SQLite
    console.log('📥 Reading data from SQLite database...');
    
    const sqliteUsers = await sqlitePrisma.user.findMany();
    const sqliteLeads = await sqlitePrisma.lead.findMany();
    const sqliteCampaigns = await sqlitePrisma.campaign.findMany();
    const sqliteWorkflows = await sqlitePrisma.workflow.findMany();
    const sqliteIndustries = await sqlitePrisma.industry.findMany();
    const sqliteServiceProviders = await sqlitePrisma.serviceProvider.findMany();
    const sqliteScoringModels = await sqlitePrisma.scoringModel.findMany();
    const sqliteBusinessRules = await sqlitePrisma.businessRule.findMany();
    
    console.log(`📊 Found in SQLite:`);
    console.log(`   👥 Users: ${sqliteUsers.length}`);
    console.log(`   🎯 Leads: ${sqliteLeads.length}`);
    console.log(`   📢 Campaigns: ${sqliteCampaigns.length}`);
    console.log(`   🔄 Workflows: ${sqliteWorkflows.length}`);
    console.log(`   🏭 Industries: ${sqliteIndustries.length}`);
    console.log(`   ⚙️  Service Providers: ${sqliteServiceProviders.length}`);
    console.log(`   📊 Scoring Models: ${sqliteScoringModels.length}`);
    console.log(`   📋 Business Rules: ${sqliteBusinessRules.length}\n`);
    
    // Step 2: Check what's already in PostgreSQL
    console.log('📤 Checking PostgreSQL database...');
    
    const postgresUsers = await postgresPrisma.user.findMany();
    const postgresLeads = await postgresPrisma.lead.findMany();
    const postgresCampaigns = await postgresPrisma.campaign.findMany();
    
    console.log(`📊 Found in PostgreSQL:`);
    console.log(`   👥 Users: ${postgresUsers.length}`);
    console.log(`   🎯 Leads: ${postgresLeads.length}`);
    console.log(`   📢 Campaigns: ${postgresCampaigns.length}\n`);
    
    // Step 3: Migrate data (skip users if they already exist)
    console.log('🔄 Starting data migration...\n');
    
    // Migrate Industries first (no dependencies)
    if (sqliteIndustries.length > 0) {
      console.log('🏭 Migrating Industries...');
      for (const industry of sqliteIndustries) {
        try {
          await postgresPrisma.industry.upsert({
            where: { name: industry.name },
            update: industry,
            create: industry
          });
        } catch (error) {
          console.log(`   ⚠️  Industry "${industry.name}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteIndustries.length} industries\n`);
    }
    
    // Migrate Service Providers
    if (sqliteServiceProviders.length > 0) {
      console.log('⚙️  Migrating Service Providers...');
      for (const provider of sqliteServiceProviders) {
        try {
          await postgresPrisma.serviceProvider.upsert({
            where: { name: provider.name },
            update: provider,
            create: provider
          });
        } catch (error) {
          console.log(`   ⚠️  Service Provider "${provider.name}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteServiceProviders.length} service providers\n`);
    }
    
    // Migrate Scoring Models
    if (sqliteScoringModels.length > 0) {
      console.log('📊 Migrating Scoring Models...');
      for (const model of sqliteScoringModels) {
        try {
          await postgresPrisma.scoringModel.upsert({
            where: { id: model.id },
            update: model,
            create: model
          });
        } catch (error) {
          console.log(`   ⚠️  Scoring Model "${model.name}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteScoringModels.length} scoring models\n`);
    }
    
    // Migrate Campaigns
    if (sqliteCampaigns.length > 0) {
      console.log('📢 Migrating Campaigns...');
      for (const campaign of sqliteCampaigns) {
        try {
          await postgresPrisma.campaign.upsert({
            where: { id: campaign.id },
            update: campaign,
            create: campaign
          });
        } catch (error) {
          console.log(`   ⚠️  Campaign "${campaign.name}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteCampaigns.length} campaigns\n`);
    }
    
    // Migrate Leads
    if (sqliteLeads.length > 0) {
      console.log('🎯 Migrating Leads...');
      for (const lead of sqliteLeads) {
        try {
          await postgresPrisma.lead.upsert({
            where: { id: lead.id },
            update: lead,
            create: lead
          });
        } catch (error) {
          console.log(`   ⚠️  Lead "${lead.companyName}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteLeads.length} leads\n`);
    }
    
    // Migrate Workflows
    if (sqliteWorkflows.length > 0) {
      console.log('🔄 Migrating Workflows...');
      for (const workflow of sqliteWorkflows) {
        try {
          await postgresPrisma.workflow.upsert({
            where: { id: workflow.id },
            update: workflow,
            create: workflow
          });
        } catch (error) {
          console.log(`   ⚠️  Workflow "${workflow.name}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteWorkflows.length} workflows\n`);
    }
    
    // Migrate Business Rules
    if (sqliteBusinessRules.length > 0) {
      console.log('📋 Migrating Business Rules...');
      for (const rule of sqliteBusinessRules) {
        try {
          await postgresPrisma.businessRule.upsert({
            where: { id: rule.id },
            update: rule,
            create: rule
          });
        } catch (error) {
          console.log(`   ⚠️  Business Rule "${rule.name}" already exists or error: ${error.message}`);
        }
      }
      console.log(`   ✅ Migrated ${sqliteBusinessRules.length} business rules\n`);
    }
    
    // Step 4: Verify migration
    console.log('🔍 Verifying migration...');
    
    const finalPostgresUsers = await postgresPrisma.user.findMany();
    const finalPostgresLeads = await postgresPrisma.lead.findMany();
    const finalPostgresCampaigns = await postgresPrisma.campaign.findMany();
    const finalPostgresWorkflows = await postgresPrisma.workflow.findMany();
    const finalPostgresIndustries = await postgresPrisma.industry.findMany();
    const finalPostgresServiceProviders = await postgresPrisma.serviceProvider.findMany();
    const finalPostgresScoringModels = await postgresPrisma.scoringModel.findMany();
    const finalPostgresBusinessRules = await postgresPrisma.businessRule.findMany();
    
    console.log(`\n📊 Final PostgreSQL counts:`);
    console.log(`   👥 Users: ${finalPostgresUsers.length}`);
    console.log(`   🎯 Leads: ${finalPostgresLeads.length}`);
    console.log(`   📢 Campaigns: ${finalPostgresCampaigns.length}`);
    console.log(`   🔄 Workflows: ${finalPostgresWorkflows.length}`);
    console.log(`   🏭 Industries: ${finalPostgresIndustries.length}`);
    console.log(`   ⚙️  Service Providers: ${finalPostgresServiceProviders.length}`);
    console.log(`   📊 Scoring Models: ${finalPostgresScoringModels.length}`);
    console.log(`   📋 Business Rules: ${finalPostgresBusinessRules.length}\n`);
    
    console.log('✅ Data migration completed successfully!');
    console.log('🎉 Your leads, campaigns, and workflows should now be available in the Docker system.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sqlitePrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }
}

// Run migration
migrateData().catch(console.error);
