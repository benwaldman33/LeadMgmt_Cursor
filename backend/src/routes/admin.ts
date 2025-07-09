import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check if user is SUPER_ADMIN
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to encrypt sensitive values
const encryptValue = (value: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Helper function to decrypt sensitive values
const decryptValue = (encryptedValue: string): string => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '[ENCRYPTED]';
  }
};

// Get all system configurations
router.get('/config', requireSuperAdmin, async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { category: 'asc' },
      include: {
        createdBy: {
          select: { fullName: true, email: true }
        }
      }
    });

    // Decrypt encrypted values for display
    const decryptedConfigs = configs.map((config: any) => ({
      ...config,
      value: config.isEncrypted ? decryptValue(config.value) : config.value
    }));

    res.json({
      success: true,
      data: decryptedConfigs
    });
  } catch (error) {
    console.error('Error fetching configs:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Create or update system configuration
router.post('/config', requireSuperAdmin, async (req, res) => {
  try {
    const { key, value, description, category, isEncrypted } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    // Encrypt value if needed
    const finalValue = isEncrypted ? encryptValue(value) : value;

    const config = await prisma.systemConfig.upsert({
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
    await prisma.auditLog.create({
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
      data: {
        ...config,
        value: isEncrypted ? '[ENCRYPTED]' : value
      }
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Delete system configuration
router.delete('/config/:key', requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    await prisma.systemConfig.delete({
      where: { key }
    });

    // Log the action
    await prisma.auditLog.create({
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
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Get system statistics
router.get('/stats', requireSuperAdmin, async (req, res) => {
  try {
    const [
      userCount,
      leadCount,
      campaignCount,
      scoringModelCount,
      integrationCount,
      auditLogCount,
      configCount
    ] = await Promise.all([
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
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

// Get recent audit logs for admin
router.get('/audit-logs', requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.auditLog.findMany({
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
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get all users (admin only)
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role/status
router.put('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const user = await prisma.user.update({
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
    await prisma.auditLog.create({
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
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router; 