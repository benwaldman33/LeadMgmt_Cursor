#!/usr/bin/env node

/**
 * Comprehensive Authentication Debug Script
 * 
 * This script tests the full authentication flow with detailed logging
 * to help identify where the login process is failing.
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials
const TEST_CREDENTIALS = [
  {
    name: 'Frontend Test User',
    email: 'frontend-test@example.com',
    password: 'Test123!',
    fullName: 'Frontend Test User'
  },
  {
    name: 'Demo User',
    email: 'demo@test.com',
    password: 'DemoPassword123!',
    fullName: 'Demo User'
  }
];

console.log('🔧 AUTHENTICATION DEBUG SCRIPT');
console.log('================================');
console.log(`🕐 Started at: ${new Date().toISOString()}`);
console.log(`🌐 Backend URL: ${BACKEND_URL}`);
console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
console.log('');

async function checkServerHealth() {
  console.log('🏥 CHECKING SERVER HEALTH');
  console.log('-------------------------');
  
  try {
    // Check backend health
    console.log('🔍 Checking backend health...');
    try {
      const backendResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      console.log(`✅ Backend is running: ${backendResponse.status} ${backendResponse.statusText}`);
      console.log(`📊 Backend response:`, backendResponse.data);
    } catch (error) {
      console.error('❌ Backend health check failed:');
      console.error(`   Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.error('   💡 Backend server appears to be down. Please start it first.');
      }
    }
    
    // Check frontend health
    console.log('🔍 Checking frontend health...');
    try {
      const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 5000 });
      console.log(`✅ Frontend is running: ${frontendResponse.status} ${frontendResponse.statusText}`);
    } catch (error) {
      console.error('❌ Frontend health check failed:');
      console.error(`   Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.error('   💡 Frontend server appears to be down. Please start it first.');
      }
    }
    
  } catch (error) {
    console.error('💥 Health check error:', error.message);
  }
  
  console.log('');
}

async function testUserRegistration(userData) {
  console.log(`👤 TESTING USER REGISTRATION: ${userData.name}`);
  console.log('-------------------------------------------');
  
  try {
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Full Name: ${userData.fullName}`);
    console.log(`🔒 Password length: ${userData.password.length}`);
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Registration successful: ${response.status}`);
    console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
    
  } catch (error) {
    if (error.response) {
      console.log(`⚠️ Registration response: ${error.response.status} ${error.response.statusText}`);
      console.log(`📦 Error data:`, JSON.stringify(error.response.data, null, 2));
      
      // If user already exists, that's okay for testing
      if (error.response.status === 409) {
        console.log(`ℹ️ User already exists - this is fine for testing`);
        return { success: true, userExists: true };
      }
    } else {
      console.error(`❌ Registration failed: ${error.message}`);
      console.error(`🚨 Error code: ${error.code}`);
    }
    return { success: false, error: error.message };
  }
}

async function testUserLogin(userData) {
  console.log(`🔐 TESTING USER LOGIN: ${userData.name}`);
  console.log('----------------------------------');
  
  try {
    console.log(`📧 Email: ${userData.email}`);
    console.log(`🔒 Password length: ${userData.password.length}`);
    console.log(`🔗 Login URL: ${BACKEND_URL}/api/auth/login`);
    
    const startTime = Date.now();
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: userData.email,
      password: userData.password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Login successful: ${response.status} (${duration}ms)`);
    console.log(`📦 Response structure:`, {
      success: response.data.success,
      hasData: !!response.data.data,
      hasUser: !!response.data.data?.user,
      hasAccessToken: !!response.data.data?.accessToken,
      userEmail: response.data.data?.user?.email,
      userRole: response.data.data?.user?.role,
      tokenLength: response.data.data?.accessToken?.length || 0
    });
    
    // Validate response structure
    if (!response.data.success) {
      console.error(`❌ Response indicates failure`);
    }
    
    if (!response.data.data) {
      console.error(`❌ Missing 'data' in response`);
    }
    
    if (!response.data.data?.user) {
      console.error(`❌ Missing 'user' in response data`);
    }
    
    if (!response.data.data?.accessToken) {
      console.error(`❌ Missing 'accessToken' in response data`);
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error(`💥 Login failed`);
    
    if (error.response) {
      console.error(`📊 HTTP Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`📦 Error response:`, JSON.stringify(error.response.data, null, 2));
      console.error(`📋 Response headers:`, error.response.headers);
    } else if (error.request) {
      console.error(`🌐 No response received from server`);
      console.error(`📡 Request details:`, error.request);
    } else {
      console.error(`⚙️ Request setup error: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

async function testAuthenticatedRequest(token, userData) {
  console.log(`🔒 TESTING AUTHENTICATED REQUEST: ${userData.name}`);
  console.log('---------------------------------------------');
  
  try {
    console.log(`🔑 Token length: ${token.length}`);
    console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);
    
    const response = await axios.get(`${BACKEND_URL}/api/auth/profile`, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Authenticated request successful: ${response.status}`);
    console.log(`👤 Profile data:`, response.data.data);
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error(`❌ Authenticated request failed`);
    
    if (error.response) {
      console.error(`📊 HTTP Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`📦 Error response:`, error.response.data);
    } else {
      console.error(`🚨 Error: ${error.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    await checkServerHealth();
    
    for (const userData of TEST_CREDENTIALS) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`TESTING CREDENTIALS: ${userData.name}`);
      console.log(`${'='.repeat(50)}`);
      
      // Test registration (create user if needed)
      const regResult = await testUserRegistration(userData);
      console.log('');
      
      // Test login
      const loginResult = await testUserLogin(userData);
      console.log('');
      
      // Test authenticated request if login was successful
      if (loginResult.success && loginResult.data?.data?.accessToken) {
        await testAuthenticatedRequest(loginResult.data.data.accessToken, userData);
        console.log('');
      }
      
      console.log(`✅ Test completed for ${userData.name}`);
    }
    
    console.log('\n🎉 ALL TESTS COMPLETED');
    console.log('======================');
    console.log('If you see successful logins above, the backend authentication is working.');
    console.log('If you\'re still having frontend issues, the problem is likely in:');
    console.log('1. Frontend not connecting to backend properly');
    console.log('2. Frontend login form or validation logic');
    console.log('3. Browser cache or session storage issues');
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('1. Open browser developer tools (F12)');
    console.log('2. Go to http://localhost:3000');
    console.log('3. Try logging in with one of the test credentials');
    console.log('4. Watch the Console and Network tabs for detailed error messages');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    console.error(error.stack);
  }
}

// Run the script
main().catch(console.error);

