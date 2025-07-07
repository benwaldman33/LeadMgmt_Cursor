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
const auth_1 = require("../middleware/auth");
const auditLogService_1 = require("../services/auditLogService");
const validation_1 = require("../middleware/validation");
const joi_1 = __importDefault(require("joi"));
const router = express_1.default.Router();
// Validation schemas
const getAuditLogsSchema = joi_1.default.object({
    action: joi_1.default.string().optional(),
    entityType: joi_1.default.string().optional(),
    entityId: joi_1.default.string().optional(),
    userId: joi_1.default.string().optional(),
    startDate: joi_1.default.date().optional(),
    endDate: joi_1.default.date().optional(),
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0),
});
const getEntityAuditLogsSchema = joi_1.default.object({
    entityType: joi_1.default.string().required(),
    entityId: joi_1.default.string().required(),
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0),
});
const getUserActivitySchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0),
});
/**
 * GET /api/audit-logs
 * Get audit logs with optional filtering
 */
router.get('/', auth_1.authenticateToken, (0, validation_1.validate)(getAuditLogsSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filters = {
            action: req.query.action,
            entityType: req.query.entityType,
            entityId: req.query.entityId,
            userId: req.query.userId,
            startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
        };
        const result = yield auditLogService_1.AuditLogService.getAuditLogs(filters);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/audit-logs/recent
 * Get recent activity for dashboard
 */
router.get('/recent', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = yield auditLogService_1.AuditLogService.getRecentActivity(limit);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId', auth_1.authenticateToken, (0, validation_1.validate)(getEntityAuditLogsSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entityType, entityId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = yield auditLogService_1.AuditLogService.getAuditLogs({
            entityType,
            entityId,
            limit,
            offset,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error fetching entity audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch entity audit logs',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/audit-logs/user/:userId
 * Get audit logs for a specific user
 */
router.get('/user/:userId', auth_1.authenticateToken, (0, validation_1.validate)(getUserActivitySchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = yield auditLogService_1.AuditLogService.getUserActivity(userId, limit);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activity',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/audit-logs/summary
 * Get activity summary for dashboard
 */
router.get('/summary', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const summary = yield auditLogService_1.AuditLogService.getActivitySummary();
        res.json({
            success: true,
            data: summary,
        });
    }
    catch (error) {
        console.error('Error fetching activity summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity summary',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/audit-logs/actions
 * Get list of available audit actions
 */
router.get('/actions', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actions = yield auditLogService_1.AuditLogService.getAuditLogs({
            limit: 1,
        });
        // Get unique actions from the database
        const uniqueActions = yield auditLogService_1.AuditLogService.getAuditLogs({
            limit: 1000, // Get all to find unique actions
        });
        const actionTypes = [...new Set(uniqueActions.logs.map((log) => log.action))];
        res.json({
            success: true,
            data: {
                actions: actionTypes,
                entityTypes: ['LEAD', 'CAMPAIGN', 'SCORING_MODEL', 'USER', 'TEAM', 'SYSTEM'],
            },
        });
    }
    catch (error) {
        console.error('Error fetching audit actions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit actions',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
exports.default = router;
