const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev_backup.db"
    }
  }
});

async function checkBackupData() {
  try {
    console.log('🔍 Checking backup SQLite database...\n');
    
    const userCount = await prisma.user.count();
    const leadCount = await prisma.lead.count();
    const campaignCount = await prisma.campaign.count();
    const workflowCount = await prisma.workflow.count();
    const industryCount = await prisma.industry.count();
    const serviceProviderCount = await prisma.serviceProvider.count();
    const scoringModelCount = await prisma.scoringModel.count();
    const businessRuleCount = await prisma.businessRule.count();
    
    console.log('📊 Backup Database Contents:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🎯 Leads: ${leadCount}`);
    console.log(`📢 Campaigns: ${campaignCount}`);
    console.log(`🔄 Workflows: ${workflowCount}`);
    console.log(`🏭 Industries: ${industryCount}`);
    console.log(`⚙️  Service Providers: ${serviceProviderCount}`);
    console.log(`📊 Scoring Models: ${scoringModelCount}`);
    console.log(`📋 Business Rules: ${businessRuleCount}\n`);
    
    if (leadCount > 0) {
      console.log('🎯 Sample Leads:');
      const leads = await prisma.lead.findMany({ take: 3 });
      leads.forEach(lead => {
        console.log(`- ${lead.companyName} (${lead.domain}) - ${lead.status}`);
      });
    }
    
    if (campaignCount > 0) {
      console.log('\n📢 Sample Campaigns:');
      const campaigns = await prisma.campaign.findMany({ take: 3 });
      campaigns.forEach(campaign => {
        console.log(`- ${campaign.name} (${campaign.industry}) - ${campaign.status}`);
      });
    }
    
    if (workflowCount > 0) {
      console.log('\n🔄 Sample Workflows:');
      const workflows = await prisma.workflow.findMany({ take: 3 });
      workflows.forEach(workflow => {
        console.log(`- ${workflow.name} - ${workflow.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBackupData();
