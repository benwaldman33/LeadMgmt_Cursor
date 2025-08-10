// Create test user for API testing
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

const testUsers = [
  {
    email: 'test@example.com',
    password: 'testpassword123',
    fullName: 'Test User',
    role: 'ADMIN'
  },
  {
    email: 'frontend-test@example.com',
    password: 'user123',
    fullName: 'Frontend Test User',
    role: 'SUPER_ADMIN'
  },
  {
    email: 'demo@test.com',
    password: 'user123',
    fullName: 'Demo Test User',
    role: 'SUPER_ADMIN'
  }
];

async function createTestUsers() {
  console.log('🔧 Creating test users...');
  console.log('');

  for (const user of testUsers) {
    try {
      console.log(`📝 Creating user: ${user.email}`);
      console.log(`   Full Name: ${user.fullName}`);
      console.log(`   Role: ${user.role}`);
      console.log('');

      // Register the user
      const response = await axios.post(`${BASE_URL}/auth/register`, user);
      
      console.log('✅ User created successfully!');
      console.log('User ID:', response.data.data.user.id);
      console.log('Token:', response.data.data.accessToken.substring(0, 20) + '...');
      console.log('');
      console.log('🎯 You can now use these credentials:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log('---');
      
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ User already exists with these credentials:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${user.password}`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('❌ Cannot connect to backend server');
        console.log('   Make sure backend is running: cd backend && npm run dev');
        break;
      } else {
        console.log('❌ Error creating user:');
        console.log('   Status:', error.response?.status);
        console.log('   Message:', error.response?.data?.error || error.message);
      }
      console.log('---');
    }
  }
}

createTestUsers();
