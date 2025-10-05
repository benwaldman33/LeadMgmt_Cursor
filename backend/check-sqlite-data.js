const { PrismaClient } = require('@prisma/client');

async function checkSQLiteData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking SQLite database for your data...\n');
    
    // Check key tables
    const userCount = await prisma.user.count();
    const leadCount = await prisma.lead.count();
    const campaignCount = await prisma.campaign.count();
    const industryCount = await prisma.industry.count();
    const serviceProviderCount = await prisma.serviceProvider.count();
    const workflowCount = await prisma.workflow.count();
    
    console.log('📊 Data Summary:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🎯 Leads: ${leadCount}`);
    console.log(`📢 Campaigns: ${campaignCount}`);
    console.log(`🏭 Industries: ${industryCount}`);
    console.log(`⚙️  Service Providers: ${serviceProviderCount}`);
    console.log(`🔄 Workflows: ${workflowCount}`);
    
    if (userCount > 0) {
      console.log('\n👥 User Details:');
      const users = await prisma.user.findMany({
        select: { email: true, fullName: true, role: true }
      });
      users.forEach(user => {
        console.log(`- ${user.email} (${user.fullName}) - ${user.role}`);
      });
    }
    
    if (leadCount > 0) {
      console.log('\n🎯 Lead Details:');
      const leads = await prisma.lead.findMany({
        take: 5,
        select: { id: true, companyName: true, email: true, createdAt: true }
      });
      leads.forEach(lead => {
        console.log(`- ${lead.companyName} (${lead.email}) - ${lead.createdAt}`);
      });
      if (leadCount > 5) {
        console.log(`... and ${leadCount - 5} more leads`);
      }
    }
    
    if (campaignCount > 0) {
      console.log('\n📢 Campaign Details:');
      const campaigns = await prisma.campaign.findMany({
        select: { id: true, name: true, description: true, createdAt: true }
      });
      campaigns.forEach(campaign => {
        console.log(`- ${campaign.name}: ${campaign.description}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking SQLite data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSQLiteData();
