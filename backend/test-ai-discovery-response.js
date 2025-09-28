const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function testAIDiscoveryResponse() {
  console.log('=== TESTING AI DISCOVERY RESPONSE ===\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Get the most recent industries
    const recentIndustries = await prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`Found ${recentIndustries.length} recent industries:\n`);
    
    recentIndustries.forEach((industry, index) => {
      console.log(`${index + 1}. ID: ${industry.id}`);
      console.log(`   Name: ${industry.name}`);
      console.log(`   Created: ${industry.createdAt}`);
      console.log(`   Updated: ${industry.updatedAt}`);
      console.log('');
    });

    // Test the getProductVerticals method with a real database ID
    if (recentIndustries.length > 0) {
      const testIndustryId = recentIndustries[0].id;
      console.log(`Testing getProductVerticals with real database ID: ${testIndustryId}`);
      
      try {
        const verticals = await prisma.productVertical.findMany({
          where: { 
            industryId: testIndustryId,
            isActive: true 
          }
        });
        
        console.log(`Found ${verticals.length} product verticals for industry ${testIndustryId}`);
        
        if (verticals.length > 0) {
          console.log('Product verticals:');
          verticals.forEach((vertical, index) => {
            console.log(`${index + 1}. ${vertical.name}`);
          });
        } else {
          console.log('No product verticals found - this is expected for newly created industries');
        }
      } catch (error) {
        console.error('Error testing getProductVerticals:', error);
      }
    }

  } catch (error) {
    console.error('Error testing AI discovery response:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAIDiscoveryResponse().then(() => {
  console.log('=== TEST COMPLETE ===');
}).catch(console.error);
