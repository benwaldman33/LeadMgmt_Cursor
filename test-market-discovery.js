// Quick test script for Market Discovery API
// Run this from project root: node test-market-discovery.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const marketCriteria = {
  minLocations: 300000,
  geography: 'US'
};

async function testMarketDiscovery() {
  try {
    console.log('🚀 Testing AI Market Discovery System...\n');

    // 1. Register test user (or login if exists)
    console.log('1. Setting up test user...');
    try {
      // Try to register a new test user
      await axios.post(`${BASE_URL}/auth/register`, {
        email: testUser.email,
        password: testUser.password,
        fullName: 'Test User',
        role: 'ADMIN'
      });
      console.log('✅ Test user created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Test user already exists');
      } else {
        console.log('⚠️  User registration failed:', error.response?.data?.error || error.message);
      }
    }

    // 2. Login to get auth token
    console.log('2. Testing Authentication...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
      authToken = loginResponse.data.token;
      console.log('✅ Authentication successful\n');
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error || error.message);
      return;
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    // 3. Test Market Analysis
    console.log('3. Testing Market Size Analysis...');
    const marketResponse = await axios.post(
      `${BASE_URL}/market-analysis/analyze-market-size`,
      marketCriteria,
      { headers }
    );
    
    console.log('✅ Market Analysis Response:');
    console.log(`   Found ${marketResponse.data.data.totalMarkets} industries`);
    console.log(`   Analysis ID: ${marketResponse.data.data.analysisId}`);
    
    if (marketResponse.data.data.industries.length > 0) {
      const firstIndustry = marketResponse.data.data.industries[0];
      console.log(`   Top Industry: ${firstIndustry.name} (${firstIndustry.locationCount.toLocaleString()} locations)`);
    }
    console.log('');

    // 4. Test Sub-Industries
    console.log('4. Testing Sub-Industry Analysis...');
    const subIndustryResponse = await axios.post(
      `${BASE_URL}/market-analysis/sub-industries`,
      { industry: 'Plumbing' },
      { headers }
    );
    
    console.log('✅ Sub-Industry Analysis Response:');
    console.log(`   Found ${subIndustryResponse.data.data.count} sub-industries`);
    if (subIndustryResponse.data.data.subIndustries.length > 0) {
      subIndustryResponse.data.data.subIndustries.forEach(sub => {
        console.log(`   - ${sub.name}: ${sub.locationCount.toLocaleString()} locations`);
      });
    }
    console.log('');

    // 5. Test Product Discovery
    console.log('5. Testing Product Discovery...');
    const productResponse = await axios.post(
      `${BASE_URL}/market-analysis/discover-products`,
      { 
        industry: 'Plumbing', 
        subIndustry: 'Commercial Plumbing' 
      },
      { headers }
    );
    
    console.log('✅ Product Discovery Response:');
    console.log(`   Found ${productResponse.data.data.suggestedProducts.length} products`);
    if (productResponse.data.data.suggestedProducts.length > 0) {
      productResponse.data.data.suggestedProducts.forEach(product => {
        console.log(`   - ${product.name}: $${product.avgPrice.min.toLocaleString()}-$${product.avgPrice.max.toLocaleString()}`);
      });
    }
    console.log('');

    // 6. Test Buyer Profile Generation
    console.log('6. Testing Buyer Profile Generation...');
    const buyerProfileResponse = await axios.post(
      `${BASE_URL}/market-analysis/buyer-profile`,
      { 
        product: 'High-pressure water jetting systems',
        industry: 'Plumbing', 
        subIndustry: 'Commercial Plumbing' 
      },
      { headers }
    );
    
    console.log('✅ Buyer Profile Response:');
    const profile = buyerProfileResponse.data.data.buyerProfile;
    console.log(`   Company Size: ${profile.demographics.companySize.min}-${profile.demographics.companySize.max} employees`);
    console.log(`   Revenue Range: $${profile.demographics.annualRevenue.min.toLocaleString()}-$${profile.demographics.annualRevenue.max.toLocaleString()}`);
    console.log(`   Pain Points: ${profile.psychographics.painPoints.slice(0, 2).join(', ')}`);
    console.log('');

    // 6. Test Search Strategy Creation
    console.log('6. Testing Search Strategy Creation...');
    const searchStrategyResponse = await axios.post(
      `${BASE_URL}/market-analysis/search-strategy`,
      { 
        buyerProfile: profile,
        product: 'High-pressure water jetting systems',
        industry: 'Plumbing'
      },
      { headers }
    );
    
    console.log('✅ Search Strategy Response:');
    const strategy = searchStrategyResponse.data.data.searchStrategy;
    console.log(`   Primary Keywords: ${strategy.keywords.primary.slice(0, 3).join(', ')}`);
    console.log(`   Target Sources: ${strategy.sources.searchEngines.join(', ')}`);
    console.log('');

    // 7. Test Stats Endpoint
    console.log('7. Testing Market Stats...');
    const statsResponse = await axios.get(
      `${BASE_URL}/market-analysis/stats`,
      { headers }
    );
    
    console.log('✅ Market Stats Response:');
    console.log(`   Total Industries Analyzed: ${statsResponse.data.data.totalIndustriesAnalyzed}`);
    console.log(`   Average Analysis Time: ${statsResponse.data.data.avgAnalysisTime}`);
    console.log('');

    console.log('🎉 ALL TESTS PASSED! Market Discovery System is working correctly.');
    console.log('✅ Ready to proceed with frontend implementation.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Debug Information:');
    console.log('   - Make sure the backend server is running (npm run dev)');
    console.log('   - Check that Claude API key is configured');
    console.log('   - Verify database is accessible');
    console.log('   - Ensure you have a valid user account for testing');
  }
}

// Run the test
testMarketDiscovery();
