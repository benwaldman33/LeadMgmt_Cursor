import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuditLogService } from '../services/auditLogService';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const getAuditLogsSchema = Joi.object({
  action: Joi.string().optional(),
  entityType: Joi.string().optional(),
  entityId: Joi.string().optional(),
  userId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const getEntityAuditLogsSchema = Joi.object({
  entityType: Joi.string().required(),
  entityId: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const getUserActivitySchema = Joi.object({
  userId: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * GET /api/audit-logs
 * Get audit logs with optional filtering
 */
router.get('/', 
  authenticateToken,
  validate(getAuditLogsSchema),
  async (req, res) => {
    try {
      const filters = {
        action: req.query.action as string,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      };

      const result = await AuditLogService.getAuditLogs(filters);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/audit-logs/recent
 * Get recent activity for dashboard
 */
router.get('/recent', 
  authenticateToken,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await AuditLogService.getRecentActivity(limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent activity',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId',
  authenticateToken,
  validate(getEntityAuditLogsSchema),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await AuditLogService.getAuditLogs({
        entityType,
        entityId,
        limit,
        offset,
      });
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch entity audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/audit-logs/user/:userId
 * Get audit logs for a specific user
 */
router.get('/user/:userId',
  authenticateToken,
  validate(getUserActivitySchema),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await AuditLogService.getUserActivity(userId, limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user activity',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/audit-logs/summary
 * Get activity summary for dashboard
 */
router.get('/summary',
  authenticateToken,
  async (req, res) => {
    try {
      const summary = await AuditLogService.getActivitySummary();
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity summary',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/audit-logs/actions
 * Get list of available audit actions
 */
router.get('/actions',
  authenticateToken,
  async (req, res) => {
    try {
      const actions = await AuditLogService.getAuditLogs({
        limit: 1,
      });
      
      // Get unique actions from the database
      const uniqueActions = await AuditLogService.getAuditLogs({
        limit: 1000, // Get all to find unique actions
      });
      
      const actionTypes = [...new Set(uniqueActions.logs.map((log: any) => log.action))];
      
      res.json({
        success: true,
        data: {
          actions: actionTypes,
          entityTypes: ['LEAD', 'CAMPAIGN', 'SCORING_MODEL', 'USER', 'TEAM', 'SYSTEM'],
        },
      });
    } catch (error) {
      console.error('Error fetching audit actions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit actions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router; 