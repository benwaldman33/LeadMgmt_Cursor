import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAIDiscovery() {
  console.log('🌱 Seeding AI Discovery data...');

  try {
    // Create industries
    const industries = [
      {
        name: 'Dental',
        description: 'Dental equipment and services',
        marketSize: '$15B',
        growthRate: '6.2% annually'
      },
      {
        name: 'Construction',
        description: 'Construction equipment and materials',
        marketSize: '$1.2T',
        growthRate: '4.8% annually'
      },
      {
        name: 'Manufacturing',
        description: 'Industrial manufacturing equipment',
        marketSize: '$2.1T',
        growthRate: '5.1% annually'
      },
      {
        name: 'Healthcare',
        description: 'Medical equipment and healthcare technology',
        marketSize: '$500B',
        growthRate: '7.3% annually'
      },
      {
        name: 'Food & Beverage',
        description: 'Food processing and beverage manufacturing',
        marketSize: '$800B',
        growthRate: '5.9% annually'
      },
      {
        name: 'Distribution & Warehouse',
        description: 'Logistics and warehouse automation',
        marketSize: '$300B',
        growthRate: '8.1% annually'
      }
    ];

    for (const industryData of industries) {
      // Check if industry exists, create if not
      let industry = await prisma.industry.findFirst({
        where: { name: industryData.name }
      });

      if (!industry) {
        industry = await prisma.industry.create({
          data: industryData
        });
        console.log(`✅ Created Industry: ${industry.name}`);
      } else {
        console.log(`✅ Industry already exists: ${industry.name}`);
      }

      // Create product verticals for each industry
      if (industry.name === 'Dental') {
        const dentalVerticals = [
          {
            name: 'CBCT Systems',
            description: '3D cone beam computed tomography for dental imaging',
            marketSize: '$1.2B',
            growthRate: '8.5% annually',
            customerTypes: [
              {
                name: 'Dental Specialists',
                description: 'Endodontists, oral surgeons, and periodontists',
                characteristics: ['High-value procedures', 'Advanced imaging needs', 'Specialized practice'],
                buyingBehavior: 'High-end equipment focus, ROI-driven',
                marketSegment: 'Premium',
                estimatedValue: '$50K-$200K'
              },
              {
                name: 'General Dentists',
                description: 'General practice dentists with advanced imaging needs',
                characteristics: ['Growing practice', 'Modern technology adoption', 'Patient education focus'],
                buyingBehavior: 'Technology-forward, patient experience focus',
                marketSegment: 'Mid-market',
                estimatedValue: '$30K-$100K'
              }
            ]
          },
          {
            name: 'Dental Lasers',
            description: 'Surgical and therapeutic laser systems for dental procedures',
            marketSize: '$800M',
            growthRate: '12% annually',
            customerTypes: [
              {
                name: 'Cosmetic Dentists',
                description: 'Dentists specializing in cosmetic and aesthetic procedures',
                characteristics: ['High-end clientele', 'Minimally invasive focus', 'Technology adoption'],
                buyingBehavior: 'Premium equipment, patient comfort focus',
                marketSegment: 'Premium',
                estimatedValue: '$40K-$150K'
              },
              {
                name: 'Periodontists',
                description: 'Specialists in gum disease and periodontal surgery',
                characteristics: ['Surgical focus', 'Advanced procedures', 'Specialized practice'],
                buyingBehavior: 'Surgical precision, clinical outcomes',
                marketSegment: 'Specialist',
                estimatedValue: '$60K-$200K'
              }
            ]
          }
        ];

        for (const verticalData of dentalVerticals) {
          const { customerTypes, ...verticalInfo } = verticalData;
          
          // Check if vertical exists, create if not
          let vertical = await prisma.productVertical.findFirst({
            where: { 
              name: verticalInfo.name,
              industryId: industry.id
            }
          });

          if (!vertical) {
            vertical = await prisma.productVertical.create({
              data: {
                ...verticalInfo,
                industryId: industry.id
              }
            });
            console.log(`  ✅ Created Product Vertical: ${vertical.name}`);
          } else {
            console.log(`  ✅ Product Vertical already exists: ${vertical.name}`);
          }

          // Create customer types for this vertical
          for (const customerTypeData of customerTypes) {
            // Check if customer type exists, create if not
            let customerType = await prisma.customerType.findFirst({
              where: {
                name: customerTypeData.name,
                productVerticalId: vertical.id
              }
            });

            if (!customerType) {
              customerType = await prisma.customerType.create({
                data: {
                  ...customerTypeData,
                  productVerticalId: vertical.id
                }
              });
              console.log(`    ✅ Created Customer Type: ${customerType.name}`);
            } else {
              console.log(`    ✅ Customer Type already exists: ${customerType.name}`);
            }
          }
        }
      }

      if (industry.name === 'Construction') {
        const constructionVerticals = [
          {
            name: 'Excavators & Heavy Equipment',
            description: 'Earthmoving and site preparation equipment',
            marketSize: '$15B',
            growthRate: '6% annually',
            customerTypes: [
              {
                name: 'Construction Companies',
                description: 'General contractors and construction firms',
                characteristics: ['Large projects', 'Equipment fleet', 'Project-based work'],
                buyingBehavior: 'ROI-focused, reliability critical',
                marketSegment: 'Commercial',
                estimatedValue: '$100K-$500K'
              },
              {
                name: 'Excavation Specialists',
                description: 'Specialized excavation and site preparation companies',
                characteristics: ['Specialized services', 'Equipment-intensive', 'Seasonal work'],
                buyingBehavior: 'Equipment reliability, service support',
                marketSegment: 'Specialist',
                estimatedValue: '$200K-$1M'
              }
            ]
          },
          {
            name: 'Safety Equipment',
            description: 'PPE and safety systems for construction sites',
            marketSize: '$3.5B',
            growthRate: '9% annually',
            customerTypes: [
              {
                name: 'Safety Managers',
                description: 'Construction companies with dedicated safety programs',
                characteristics: ['Compliance focus', 'Employee safety', 'Risk management'],
                buyingBehavior: 'Compliance-driven, quality focus',
                marketSegment: 'Corporate',
                estimatedValue: '$10K-$100K'
              }
            ]
          }
        ];

        for (const verticalData of constructionVerticals) {
          const { customerTypes, ...verticalInfo } = verticalData;
          
          // Check if vertical exists, create if not
          let vertical = await prisma.productVertical.findFirst({
            where: { 
              name: verticalInfo.name,
              industryId: industry.id
            }
          });

          if (!vertical) {
            vertical = await prisma.productVertical.create({
              data: {
                ...verticalInfo,
                industryId: industry.id
              }
            });
            console.log(`  ✅ Created Product Vertical: ${vertical.name}`);
          } else {
            console.log(`  ✅ Product Vertical already exists: ${vertical.name}`);
          }

          // Create customer types for this vertical
          for (const customerTypeData of customerTypes) {
            // Check if customer type exists, create if not
            let customerType = await prisma.customerType.findFirst({
              where: {
                name: customerTypeData.name,
                productVerticalId: vertical.id
              }
            });

            if (!customerType) {
              customerType = await prisma.customerType.create({
                data: {
                  ...customerTypeData,
                  productVerticalId: vertical.id
                }
              });
              console.log(`    ✅ Created Customer Type: ${customerType.name}`);
            } else {
              console.log(`    ✅ Customer Type already exists: ${customerType.name}`);
            }
          }
        }
      }

      if (industry.name === 'Food & Beverage') {
        const foodBeverageVerticals = [
          {
            name: 'Plant Based Meat',
            description: 'Plant-based meat alternatives and processing equipment',
            marketSize: '$7.9B',
            growthRate: '15% annually',
            customerTypes: [
              {
                name: 'Food Service Distributors',
                description: 'Large distributors supplying restaurants and institutions',
                characteristics: ['High volume', 'Quality standards', 'Supply chain focus'],
                buyingBehavior: 'Long-term contracts, volume commitments',
                marketSegment: 'Commercial',
                estimatedValue: '$50K-$500K'
              },
              {
                name: 'Restaurant Chains',
                description: 'Fast-casual and fine dining establishments',
                characteristics: ['Menu innovation', 'Sustainability focus', 'Customer demand'],
                buyingBehavior: 'Quality focus, supplier reliability',
                marketSegment: 'Premium',
                estimatedValue: '$25K-$200K'
              }
            ]
          },
          {
            name: 'Beverage Processing',
            description: 'Beverage manufacturing and processing equipment',
            marketSize: '$12B',
            growthRate: '8% annually',
            customerTypes: [
              {
                name: 'Beverage Manufacturers',
                description: 'Companies producing soft drinks, juices, and functional beverages',
                characteristics: ['High production volume', 'Quality control', 'Efficiency focus'],
                buyingBehavior: 'Capital-intensive, ROI-driven',
                marketSegment: 'Commercial',
                estimatedValue: '$100K-$1M'
              },
              {
                name: 'Craft Breweries',
                description: 'Small to medium-sized beer and cider producers',
                characteristics: ['Quality focus', 'Innovation', 'Local market'],
                buyingBehavior: 'Equipment reliability, service support',
                marketSegment: 'Specialist',
                estimatedValue: '$50K-$300K'
              }
            ]
          }
        ];

        for (const verticalData of foodBeverageVerticals) {
          const { customerTypes, ...verticalInfo } = verticalData;
          
          // Check if vertical exists, create if not
          let vertical = await prisma.productVertical.findFirst({
            where: { 
              name: verticalInfo.name,
              industryId: industry.id
            }
          });

          if (!vertical) {
            vertical = await prisma.productVertical.create({
              data: {
                ...verticalInfo,
                industryId: industry.id
              }
            });
            console.log(`  ✅ Created Product Vertical: ${vertical.name}`);
          } else {
            console.log(`  ✅ Product Vertical already exists: ${vertical.name}`);
          }

          // Create customer types for this vertical
          for (const customerTypeData of customerTypes) {
            // Check if customer type exists, create if not
            let customerType = await prisma.customerType.findFirst({
              where: {
                name: customerTypeData.name,
                productVerticalId: vertical.id
              }
            });

            if (!customerType) {
              customerType = await prisma.customerType.create({
                data: {
                  ...customerTypeData,
                  productVerticalId: vertical.id
                }
              });
              console.log(`    ✅ Created Customer Type: ${customerType.name}`);
            } else {
              console.log(`    ✅ Customer Type already exists: ${customerType.name}`);
            }
          }
        }
      }
    }

    console.log('✅ AI Discovery seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding AI Discovery data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAIDiscovery()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
