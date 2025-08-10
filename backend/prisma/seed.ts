import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create dummy admin user
  const adminPasswordHash = await bcrypt.hash('user123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'dumadmin@bbds.com' },
    update: {},
    create: {
      email: 'dumadmin@bbds.com',
      fullName: 'Dummy Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Create dummy general user
  const userPasswordHash = await bcrypt.hash('user123', 12);
  const generalUser = await prisma.user.upsert({
    where: { email: 'genuser@bbds.com' },
    update: {},
    create: {
      email: 'genuser@bbds.com',
      fullName: 'General User',
      passwordHash: userPasswordHash,
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  });

  // Create frontend test user with super admin rights
  const frontendTestPasswordHash = await bcrypt.hash('user123', 12);
  const frontendTestUser = await prisma.user.upsert({
    where: { email: 'frontend-test@example.com' },
    update: {},
    create: {
      email: 'frontend-test@example.com',
      fullName: 'Frontend Test User',
      passwordHash: frontendTestPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Create demo test user with super admin rights
  const demoTestPasswordHash = await bcrypt.hash('user123', 12);
  const demoTestUser = await prisma.user.upsert({
    where: { email: 'demo@test.com' },
    update: {},
    create: {
      email: 'demo@test.com',
      fullName: 'Demo Test User',
      passwordHash: demoTestPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  // Create a test team (use upsert to prevent duplicates)
  const testTeam = await prisma.team.upsert({
    where: { name: 'Dental Equipment Team' },
    update: {},
    create: {
      name: 'Dental Equipment Team',
      industry: 'Dental Equipment',
    },
  });

  // Assign users to team
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { teamId: testTeam.id },
  });

  await prisma.user.update({
    where: { id: generalUser.id },
    data: { teamId: testTeam.id },
  });

  await prisma.user.update({
    where: { id: frontendTestUser.id },
    data: { teamId: testTeam.id },
  });

  await prisma.user.update({
    where: { id: demoTestUser.id },
    data: { teamId: testTeam.id },
  });

  console.log('✅ Database seeded successfully!');
  console.log('👤 Admin User:', adminUser.email);
  console.log('👤 General User:', generalUser.email);
  console.log('👤 Frontend Test User:', frontendTestUser.email);
  console.log('👤 Demo Test User:', demoTestUser.email);
  console.log('👥 Team:', testTeam.name);
  console.log('');
  console.log('🔑 Login Credentials:');
  console.log('Admin: dumadmin@bbds.com / user123');
  console.log('User: genuser@bbds.com / user123');
  console.log('Frontend Test: frontend-test@example.com / user123');
  console.log('Demo Test: demo@test.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 