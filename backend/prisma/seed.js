"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Starting database seed...');
        // Create dummy admin user
        const adminPasswordHash = yield bcryptjs_1.default.hash('user123', 12);
        const adminUser = yield prisma.user.upsert({
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
        const userPasswordHash = yield bcryptjs_1.default.hash('user123', 12);
        const generalUser = yield prisma.user.upsert({
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
        // Create a test team
        const testTeam = yield prisma.team.create({
            data: {
                name: 'Dental Equipment Team',
                industry: 'Dental Equipment',
            },
        });
        // Assign users to team
        yield prisma.user.update({
            where: { id: adminUser.id },
            data: { teamId: testTeam.id },
        });
        yield prisma.user.update({
            where: { id: generalUser.id },
            data: { teamId: testTeam.id },
        });
        console.log('✅ Database seeded successfully!');
        console.log('👤 Admin User:', adminUser.email);
        console.log('👤 General User:', generalUser.email);
        console.log('👥 Team:', testTeam.name);
        console.log('');
        console.log('🔑 Login Credentials:');
        console.log('Admin: dumadmin@bbds.com / user123');
        console.log('User: genuser@bbds.com / user123');
    });
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
