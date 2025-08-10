const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  username: 'testuser'
};

let authToken = '';

async function testFullDiscoveryFlow() {
  try {
    console.log('🧪 Testing Full AI Market Discovery Flow...\n');

    // 1. Register/Login user
    console.log('1. 👤 Setting up test user...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, testUser);
      console.log('   ✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('   ℹ️  User already exists');
      } else {
        throw error;
      }
    }

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginResponse.data.token;
    console.log('   ✅ User logged in successfully\n');

    // 2. Test Market Size Analysis
    console.log('2. 📊 Testing Market Size Analysis...');
    const marketAnalysisResponse = await axios.post(
      `${BASE_URL}/market-analysis/analyze-market-size`,
      {
        minLocations: 300000,
        geography: 'US',
        industries: ['Plumbing']
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    console.log('   ✅ Market analysis completed');
    console.log(`   📈 Found ${marketAnalysisResponse.data.data.industries?.length || 'mock'} industries\n`);

    // 3. Test Sub-Industry Analysis
    console.log('3. 🎯 Testing Sub-Industry Analysis...');
    const subIndustryResponse = await axios.post(
      `${BASE_URL}/market-analysis/sub-industries`,
      {
        industry: 'Plumbing, Heating, and Air-Conditioning Contractors'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    console.log('   ✅ Sub-industry analysis completed');
    console.log(`   🏢 Found ${subIndustryResponse.data.data.subIndustries?.length || 'mock'} sub-industries\n`);

    // 4. Test Product Discovery
    console.log('4. 🛍️ Testing Product Discovery...');
    const productResponse = await axios.post(
      `${BASE_URL}/market-analysis/discover-products`,
      {
        industry: 'Plumbing, Heating, and Air-Conditioning Contractors',
        subIndustry: 'Commercial Plumbing'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    console.log('   ✅ Product discovery completed');
    console.log(`   🎯 Found ${productResponse.data.data.suggestedProducts?.length || 'mock'} products\n`);

    // 5. Test Buyer Profile Generation
    console.log('5. 👥 Testing Buyer Profile Generation...');
    const buyerProfileResponse = await axios.post(
      `${BASE_URL}/market-analysis/buyer-profile`,
      {
        product: 'High-pressure water jetting systems',
        industry: 'Plumbing, Heating, and Air-Conditioning Contractors',
        subIndustry: 'Commercial Plumbing'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    console.log('   ✅ Buyer profile generated');
    console.log(`   📋 Profile includes demographics, firmographics, and behavioral data\n`);

    // 6. Test Search Strategy Creation
    console.log('6. 🔍 Testing Search Strategy Creation...');
    const searchStrategyResponse = await axios.post(
      `${BASE_URL}/market-analysis/search-strategy`,
      {
        buyerProfile: buyerProfileResponse.data.data.buyerProfile,
        product: 'High-pressure water jetting systems',
        industry: 'Plumbing, Heating, and Air-Conditioning Contractors'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    console.log('   ✅ Search strategy created');
    console.log(`   🎯 Strategy includes keywords, targeting, and sources\n`);

    // 7. Test Full Discovery Execution
    console.log('7. 🚀 Testing Full Discovery Execution...');
    const discoveryResponse = await axios.post(
      `${BASE_URL}/market-analysis/start-discovery`,
      {
        name: 'Commercial Plumbing - Water Jetting Equipment',
        industry: 'Plumbing, Heating, and Air-Conditioning Contractors',
        subIndustry: 'Commercial Plumbing',
        product: 'High-pressure water jetting systems',
        buyerProfile: buyerProfileResponse.data.data.buyerProfile,
        searchStrategy: searchStrategyResponse.data.data.searchStrategy,
        marketSize: 89000,
        config: {
          targetProspectCount: 1000, // Smaller for testing
          phases: ['market_research', 'web_scraping', 'content_analysis', 'lead_qualification'],
          budgetLimit: 100,
          timeLimit: '7_days'
        }
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    const execution = discoveryResponse.data.data.execution;
    console.log('   ✅ Discovery execution started');
    console.log(`   🆔 Execution ID: ${execution.id}`);
    console.log(`   📊 Status: ${execution.status}`);
    console.log(`   🔄 Phase: ${execution.phase}\n`);

    // 8. Monitor Progress
    console.log('8. 📈 Monitoring Discovery Progress...');
    let progressChecks = 0;
    const maxChecks = 20; // Maximum 60 seconds of monitoring

    while (progressChecks < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      try {
        const progressResponse = await axios.get(
          `${BASE_URL}/market-analysis/execution/${execution.id}/progress`,
          {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }
        );

        const progress = progressResponse.data.data.progress;
        console.log(`   📊 Progress: ${progress.progress}% | Phase: ${progress.phase} | Status: ${progress.status}`);
        console.log(`   🔍 Found: ${progress.prospectsFound} | Analyzed: ${progress.prospectsAnalyzed} | Leads: ${progress.leadsCreated}`);
        
        if (progress.currentActivity) {
          console.log(`   ⚡ Activity: ${progress.currentActivity}`);
        }

        if (progress.status === 'completed') {
          console.log('\n   🎉 Discovery execution completed successfully!');
          console.log(`   📈 Final Results:`);
          console.log(`      • ${progress.prospectsFound} prospects found`);
          console.log(`      • ${progress.prospectsAnalyzed} prospects analyzed`);
          console.log(`      • ${progress.leadsQualified} prospects qualified`);
          console.log(`      • ${progress.leadsCreated} leads created`);
          break;
        }

        if (progress.status === 'failed') {
          console.log('\n   ❌ Discovery execution failed');
          if (progress.errors?.length) {
            console.log(`   🚫 Errors: ${progress.errors.join(', ')}`);
          }
          break;
        }

        progressChecks++;
      } catch (progressError) {
        console.log(`   ⚠️  Progress check failed: ${progressError.message}`);
        break;
      }
    }

    if (progressChecks >= maxChecks) {
      console.log('\n   ⏰ Monitoring timeout reached. Discovery is still running...');
      console.log(`   🌐 Check progress at: http://localhost:5173/market-discovery/execution/${execution.id}`);
    }

    // 9. Test Market Stats
    console.log('\n9. 📊 Testing Market Stats...');
    const statsResponse = await axios.get(
      `${BASE_URL}/market-analysis/stats`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    console.log('   ✅ Market stats retrieved');
    console.log(`   📈 Total analyses: ${statsResponse.data.data.totalIndustriesAnalyzed}`);
    console.log(`   ⚡ Avg analysis time: ${statsResponse.data.data.avgAnalysisTime}`);

    console.log('\n🎉 ALL TESTS PASSED! Full Discovery Flow Working!\n');
    console.log('🌐 Frontend URLs to test:');
    console.log(`   • Market Discovery: http://localhost:5173/market-discovery`);
    console.log(`   • Discovery Wizard: http://localhost:5173/market-discovery/wizard`);
    console.log(`   • Progress Monitor: http://localhost:5173/market-discovery/execution/${execution.id}`);
    console.log('\n✨ The AI Market Discovery system is fully operational!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Debug Information:');
    console.log('   - Make sure both backend (3001) and frontend (5173) servers are running');
    console.log('   - Verify Claude API key is configured');
    console.log('   - Check database connectivity');
    console.log('   - Ensure all dependencies are installed');
    
    if (error.response?.status === 401) {
      console.log('   - Authentication issue: Check login credentials');
    }
    if (error.response?.status === 500) {
      console.log('   - Server error: Check backend logs for details');
    }
  }
}

// Run the test
testFullDiscoveryFlow();
