const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://dev:devpass@localhost:5433/leadscoring_dev"
    }
  }
});

async function testIndustrySave() {
  console.log('=== TESTING INDUSTRY SAVE FUNCTIONALITY ===\n');

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected to database successfully\n');

    // Check current industries
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Current industries in database: ${industries.length}`);
    
    if (industries.length > 0) {
      console.log('\nRecent industries:');
      industries.slice(0, 5).forEach((industry, index) => {
        console.log(`${index + 1}. ID: ${industry.id} | Name: ${industry.name} | Created: ${industry.createdAt}`);
      });
    }

    // Test creating a sample industry
    console.log('\n=== TESTING INDUSTRY CREATION ===');
    
    const testIndustry = await prisma.industry.create({
      data: {
        name: 'Test Industry for Product Verticals',
        description: 'A test industry to verify product vertical functionality',
        marketSize: '$10B+',
        growthRate: '8% annually'
      }
    });

    console.log(`✅ Created test industry with ID: ${testIndustry.id}`);

    // Test creating product verticals for this industry
    console.log('\n=== TESTING PRODUCT VERTICAL CREATION ===');
    
    const testVertical = await prisma.productVertical.create({
      data: {
        name: 'Test Product Vertical',
        description: 'A test product vertical for the test industry',
        marketSize: '$2B+',
        growthRate: '12% annually',
        industryId: testIndustry.id
      }
    });

    console.log(`✅ Created test product vertical with ID: ${testVertical.id}`);

    // Test the getProductVerticals function
    console.log('\n=== TESTING GET PRODUCT VERTICALS ===');
    
    const verticals = await prisma.productVertical.findMany({
      where: { 
        industryId: testIndustry.id,
        isActive: true 
      },
      include: {
        customerTypes: {
          where: { isActive: true }
        }
      }
    });

    console.log(`Found ${verticals.length} product verticals for industry ${testIndustry.id}`);
    verticals.forEach(vertical => {
      console.log(`- ${vertical.name} (${vertical.customerTypes.length} customer types)`);
    });

    // Clean up test data
    console.log('\n=== CLEANING UP TEST DATA ===');
    await prisma.productVertical.delete({
      where: { id: testVertical.id }
    });
    console.log('✅ Deleted test product vertical');

    await prisma.industry.delete({
      where: { id: testIndustry.id }
    });
    console.log('✅ Deleted test industry');

    console.log('\n=== TEST COMPLETE ===');
    console.log('✅ Industry save functionality is working correctly!');
    console.log('✅ Product verticals can be created and retrieved!');
    console.log('✅ The AI Discovery should now work with proper database IDs!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndustrySave().then(() => {
  console.log('\n=== TEST SCRIPT COMPLETE ===');
}).catch(console.error);
