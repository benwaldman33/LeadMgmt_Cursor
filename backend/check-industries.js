const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function checkIndustries() {
  console.log('=== CHECKING INDUSTRIES IN DATABASE ===\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Get all industries
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      include: {
        productVerticals: {
          where: { isActive: true },
          include: {
            customerTypes: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${industries.length} active industries:\n`);

    industries.forEach((industry, index) => {
      console.log(`${index + 1}. Industry: ${industry.name}`);
      console.log(`   ID: ${industry.id}`);
      console.log(`   Description: ${industry.description}`);
      console.log(`   Market Size: ${industry.marketSize}`);
      console.log(`   Growth Rate: ${industry.growthRate}`);
      console.log(`   Product Verticals: ${industry.productVerticals.length}`);
      
      if (industry.productVerticals.length > 0) {
        console.log('   Verticals:');
        industry.productVerticals.forEach(vertical => {
          console.log(`     - ${vertical.name} (${vertical.customerTypes.length} customer types)`);
        });
      }
      console.log('');
    });

    // Check for the specific industry ID from the error
    const specificIndustryId = 'ai_discovered_1756693462878_4';
    console.log(`\n=== CHECKING SPECIFIC INDUSTRY ID: ${specificIndustryId} ===`);
    
    const specificIndustry = await prisma.industry.findFirst({
      where: { id: specificIndustryId }
    });

    if (specificIndustry) {
      console.log('✅ Industry found!');
      console.log(`Name: ${specificIndustry.name}`);
      console.log(`Description: ${specificIndustry.description}`);
      console.log(`Active: ${specificIndustry.isActive}`);
    } else {
      console.log('❌ Industry NOT found in database');
      console.log('This explains the 500 error - the industry ID does not exist');
    }

    // Check for any industries with similar IDs
    console.log('\n=== CHECKING FOR SIMILAR INDUSTRY IDS ===');
    const similarIndustries = await prisma.industry.findMany({
      where: {
        id: {
          contains: 'ai_discovered'
        }
      }
    });

    if (similarIndustries.length > 0) {
      console.log(`Found ${similarIndustries.length} industries with 'ai_discovered' in ID:`);
      similarIndustries.forEach(industry => {
        console.log(`- ${industry.id}: ${industry.name}`);
      });
    } else {
      console.log('No industries found with "ai_discovered" in ID');
    }

  } catch (error) {
    console.error('Error checking industries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIndustries().then(() => {
  console.log('\n=== INDUSTRY CHECK COMPLETE ===');
}).catch(console.error);
