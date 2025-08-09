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
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Middleware to check if user is SUPER_ADMIN
const requireSuperAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        if (!user || user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Super admin access required' });
        }
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Helper function to encrypt sensitive values
const encryptValue = (value) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};
// Helper function to decrypt sensitive values
const decryptValue = (encryptedValue) => {
    try {
        const algorithm = 'aes-256-cbc';
        const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const parts = encryptedValue.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        return '[ENCRYPTED]';
    }
};
// Get all system configurations
router.get('/config', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const configs = yield prisma.systemConfig.findMany({
            orderBy: { category: 'asc' },
            include: {
                createdBy: {
                    select: { fullName: true, email: true }
                }
            }
        });
        // Decrypt encrypted values for display
        const decryptedConfigs = configs.map((config) => (Object.assign(Object.assign({}, config), { value: config.isEncrypted ? decryptValue(config.value) : config.value })));
        res.json({
            success: true,
            data: decryptedConfigs
        });
    }
    catch (error) {
        console.error('Error fetching configs:', error);
        res.status(500).json({ error: 'Failed to fetch configurations' });
    }
}));
// Create or update system configuration
router.post('/config', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key, value, description, category, isEncrypted } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        // Encrypt value if needed
        const finalValue = isEncrypted ? encryptValue(value) : value;
        const config = yield prisma.systemConfig.upsert({
            where: { key },
            update: {
                value: finalValue,
                description,
                category: category || 'GENERAL',
                isEncrypted: isEncrypted || false,
                updatedAt: new Date()
            },
            create: {
                key,
                value: finalValue,
                description,
                category: category || 'GENERAL',
                isEncrypted: isEncrypted || false,
                createdById: req.user.id
            }
        });
        // Log the action
        yield prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'SYSTEM_CONFIG',
                entityId: config.id,
                description: `Updated system configuration: ${key}`,
                userId: req.user.id,
                metadata: JSON.stringify({ key, category })
            }
        });
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, config), { value: isEncrypted ? '[ENCRYPTED]' : value })
        });
    }
    catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
}));
// Delete system configuration
router.delete('/config/:key', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const config = yield prisma.systemConfig.findUnique({
            where: { key }
        });
        if (!config) {
            return res.status(404).json({ error: 'Configuration not found' });
        }
        yield prisma.systemConfig.delete({
            where: { key }
        });
        // Log the action
        yield prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entityType: 'SYSTEM_CONFIG',
                entityId: config.id,
                description: `Deleted system configuration: ${key}`,
                userId: req.user.id,
                metadata: JSON.stringify({ key, category: config.category })
            }
        });
        res.json({
            success: true,
            message: 'Configuration deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting config:', error);
        res.status(500).json({ error: 'Failed to delete configuration' });
    }
}));
// Get system statistics
router.get('/stats', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [userCount, leadCount, campaignCount, scoringModelCount, integrationCount, auditLogCount, configCount] = yield Promise.all([
            prisma.user.count(),
            prisma.lead.count(),
            prisma.campaign.count(),
            prisma.scoringModel.count(),
            prisma.integration.count(),
            prisma.auditLog.count(),
            prisma.systemConfig.count()
        ]);
        res.json({
            success: true,
            data: {
                users: userCount,
                leads: leadCount,
                campaigns: campaignCount,
                scoringModels: scoringModelCount,
                integrations: integrationCount,
                auditLogs: auditLogCount,
                configurations: configCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch system statistics' });
    }
}));
// Get recent audit logs for admin
router.get('/audit-logs', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const logs = yield prisma.auditLog.findMany({
            take: Number(limit),
            skip: Number(offset),
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { fullName: true, email: true }
                }
            }
        });
        res.json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
}));
// Get all users (admin only)
router.get('/users', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true,
                team: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}));
// Update user role/status
router.put('/users/:id', requireSuperAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { role, status } = req.body;
        const user = yield prisma.user.update({
            where: { id },
            data: {
                role: role || undefined,
                status: status || undefined
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                status: true
            }
        });
        // Log the action
        yield prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entityType: 'USER',
                entityId: user.id,
                description: `Updated user role/status: ${user.email}`,
                userId: req.user.id,
                metadata: JSON.stringify({ role, status })
            }
        });
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
}));
exports.default = router;
