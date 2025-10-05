const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    const hash = await bcrypt.hash('admin123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'admin@bbds.com',
        passwordHash: hash,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Created user:', user.email);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

createAdmin();


