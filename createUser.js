const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');
    const passwordHash = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: passwordHash,
        fullName: 'Test User',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log('Created test user:', user.email);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating user:', error.message);
    await prisma.$disconnect();
  }
  process.exit(0);
}

createTestUser();
