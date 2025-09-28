const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function testAIDiscoveryFix() {
  console.log('=== TESTING AI DISCOVERY FIX ===\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Check initial state
    const initialIndustries = await prisma.industry.findMany({
      where: { isActive: true }
    });
    console.log(`Initial industries in database: ${initialIndustries.length}`);

    if (initialIndustries.length > 0) {
      console.log('Sample industry IDs:');
      initialIndustries.slice(0, 3).forEach(industry => {
        console.log(`- ${industry.id}: ${industry.name}`);
      });
    }

    console.log('\n=== INSTRUCTIONS ===');
    console.log('1. Go to the AI Discovery page in your browser');
    console.log('2. Enter a search term like "healthcare technology"');
    console.log('3. Click "Discover Industries"');
    console.log('4. Wait for the AI to discover industries');
    console.log('5. Run this script again to check if industries were saved');
    console.log('\nThe fix should now save discovered industries to the database');
    console.log('so that when you click on an industry, it can find product verticals.');

  } catch (error) {
    console.error('Error testing AI discovery fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAIDiscoveryFix().then(() => {
  console.log('\n=== TEST COMPLETE ===');
}).catch(console.error);
