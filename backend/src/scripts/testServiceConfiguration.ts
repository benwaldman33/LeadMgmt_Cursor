import { ServiceConfigurationService } from '../services/serviceConfigurationService';

const serviceConfig = new ServiceConfigurationService();

async function testServiceConfiguration() {
  console.log('🧪 Testing Service Configuration System...\n');

  try {
    // Test 1: Get all service providers
    console.log('1. Testing get all service providers...');
    const providers = await serviceConfig.getAllServiceProviders();
    console.log(`   ✅ Found ${providers.length} service providers`);
    providers.forEach(p => console.log(`      - ${p.name} (${p.type})`));
    console.log('');

    // Test 2: Get available services for AI Discovery
    console.log('2. Testing get available services for AI_DISCOVERY...');
    const aiDiscoveryServices = await serviceConfig.getAvailableServices('AI_DISCOVERY');
    console.log(`   ✅ Found ${aiDiscoveryServices.length} services for AI Discovery`);
    aiDiscoveryServices.forEach(s => console.log(`      - ${s.name} (Priority: ${s.priority})`));
    console.log('');

    // Test 3: Get available services for Market Discovery
    console.log('3. Testing get available services for MARKET_DISCOVERY...');
    const marketDiscoveryServices = await serviceConfig.getAvailableServices('MARKET_DISCOVERY');
    console.log(`   ✅ Found ${marketDiscoveryServices.length} services for Market Discovery`);
    marketDiscoveryServices.forEach(s => console.log(`      - ${s.name} (Priority: ${s.priority})`));
    console.log('');

    // Test 4: Get available services for Web Scraping
    console.log('4. Testing get available services for WEB_SCRAPING...');
    const webScrapingServices = await serviceConfig.getAvailableServices('WEB_SCRAPING');
    console.log(`   ✅ Found ${webScrapingServices.length} services for Web Scraping`);
    webScrapingServices.forEach(s => console.log(`      - ${s.name} (Priority: ${s.priority})`));
    console.log('');

    // Test 5: Get available services for Site Analysis
    console.log('5. Testing get available services for SITE_ANALYSIS...');
    const siteAnalysisServices = await serviceConfig.getAvailableServices('SITE_ANALYSIS');
    console.log(`   ✅ Found ${siteAnalysisServices.length} services for Site Analysis`);
    siteAnalysisServices.forEach(s => console.log(`      - ${s.name} (Priority: ${s.priority})`));
    console.log('');

    // Test 6: Service selection
    console.log('6. Testing service selection...');
    const selectedService = await serviceConfig.selectService('AI_DISCOVERY');
    if (selectedService) {
      console.log(`   ✅ Selected service: ${selectedService.name} for AI Discovery`);
    } else {
      console.log('   ❌ No service available for AI Discovery');
    }
    console.log('');

    // Test 7: Get metadata
    console.log('7. Testing metadata...');
    const operations = serviceConfig.getAvailableOperations();
    const serviceTypes = serviceConfig.getAvailableServiceTypes();
    console.log(`   ✅ Available operations: ${operations.join(', ')}`);
    console.log(`   ✅ Available service types: ${serviceTypes.join(', ')}`);
    console.log('');

    // Test 8: Check service limits
    console.log('8. Testing service limits check...');
    if (providers.length > 0) {
      const firstProvider = providers[0];
      const withinLimits = await serviceConfig.checkServiceLimits(
        firstProvider.id, 
        'AI_DISCOVERY'
      );
      console.log(`   ✅ Service ${firstProvider.name} within limits: ${withinLimits}`);
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total service providers: ${providers.length}`);
    console.log(`   - AI Discovery services: ${aiDiscoveryServices.length}`);
    console.log(`   - Market Discovery services: ${marketDiscoveryServices.length}`);
    console.log(`   - Web Scraping services: ${webScrapingServices.length}`);
    console.log(`   - Site Analysis services: ${siteAnalysisServices.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Access the prisma client through the service
    const prisma = (serviceConfig as any).prisma;
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testServiceConfiguration();
}

export default testServiceConfiguration;
