const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function checkCurrentIndustries() {
  console.log('=== CHECKING CURRENT INDUSTRIES IN DATABASE ===\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Get all industries
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total industries in database: ${industries.length}\n`);

    if (industries.length > 0) {
      console.log('Recent industries:');
      industries.slice(0, 10).forEach((industry, index) => {
        console.log(`${index + 1}. ID: ${industry.id}`);
        console.log(`   Name: ${industry.name}`);
        console.log(`   Created: ${industry.createdAt}`);
        console.log(`   Updated: ${industry.updatedAt}`);
        console.log('');
      });
    } else {
      console.log('No industries found in database');
    }

  } catch (error) {
    console.error('Error checking industries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentIndustries().then(() => {
  console.log('=== CHECK COMPLETE ===');
}).catch(console.error);
