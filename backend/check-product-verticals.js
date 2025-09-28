const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function checkProductVerticals() {
  console.log('=== CHECKING PRODUCT VERTICALS IN DATABASE ===\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Get all industries
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      include: {
        productVerticals: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total industries in database: ${industries.length}\n`);

    if (industries.length > 0) {
      console.log('Recent industries with their product verticals:');
      industries.slice(0, 5).forEach((industry, index) => {
        console.log(`\n${index + 1}. ${industry.name} (ID: ${industry.id})`);
        console.log(`   Description: ${industry.description}`);
        console.log(`   Market Size: ${industry.marketSize}`);
        console.log(`   Growth Rate: ${industry.growthRate}`);
        console.log(`   Product Verticals: ${industry.productVerticals.length}`);
        
        if (industry.productVerticals.length > 0) {
          industry.productVerticals.forEach((vertical, vIndex) => {
            console.log(`     ${vIndex + 1}. ${vertical.name} (${vertical.description})`);
          });
        } else {
          console.log('     ❌ No product verticals found');
        }
      });
    }

    // Check total product verticals
    const totalVerticals = await prisma.productVertical.count({
      where: { isActive: true }
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total industries: ${industries.length}`);
    console.log(`Total product verticals: ${totalVerticals}`);
    console.log(`Average verticals per industry: ${industries.length > 0 ? (totalVerticals / industries.length).toFixed(2) : 0}`);

    if (totalVerticals === 0) {
      console.log('\n❌ NO PRODUCT VERTICALS FOUND!');
      console.log('This explains why the frontend shows "0 product verticals"');
      console.log('The AI discovery is creating industries but not product verticals.');
    }

  } catch (error) {
    console.error('Error checking product verticals:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductVerticals().then(() => {
  console.log('\n=== CHECK COMPLETE ===');
}).catch(console.error);
