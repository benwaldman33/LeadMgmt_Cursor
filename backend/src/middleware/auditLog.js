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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_CONFIGS = exports.logAuditActivity = exports.auditLog = void 0;
const auditLogService_1 = require("../services/auditLogService");
/**
 * Middleware to automatically log audit activities
 */
const auditLog = (options) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const originalSend = res.send;
        const originalJson = res.json;
        const originalStatus = res.status;
        let responseBody;
        let statusCode = 200;
        // Override response methods to capture response data
        res.send = function (body) {
            responseBody = body;
            return originalSend.call(this, body);
        };
        res.json = function (body) {
            responseBody = body;
            return originalJson.call(this, body);
        };
        res.status = function (code) {
            statusCode = code;
            return originalStatus.call(this, code);
        };
        // Continue to next middleware
        next();
        // Log the activity after the request is processed
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            const entityId = options.getEntityId ? options.getEntityId(req, res) : undefined;
            const description = options.getDescription ? options.getDescription(req, res) : options.action;
            const metadata = options.getMetadata ? options.getMetadata(req, res) : undefined;
            // Only log successful operations unless skipOnError is false
            if (statusCode >= 200 && statusCode < 300) {
                yield auditLogService_1.AuditLogService.logActivity({
                    action: options.action,
                    entityType: options.entityType,
                    entityId,
                    description,
                    userId,
                    metadata,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                });
            }
        }
        catch (error) {
            console.error('Failed to log audit activity:', error);
            // Don't throw - audit logging should not break main functionality
        }
    });
};
exports.auditLog = auditLog;
/**
 * Manual audit logging function for complex scenarios
 */
const logAuditActivity = (action, entityType, description, userId, entityId, metadata, ipAddress, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    yield auditLogService_1.AuditLogService.logActivity({
        action,
        entityType,
        entityId,
        description,
        userId,
        metadata,
        ipAddress,
        userAgent,
    });
});
exports.logAuditActivity = logAuditActivity;
/**
 * Common audit log configurations
 */
exports.AUDIT_CONFIGS = {
    // Lead operations
    LEAD_CREATE: {
        action: auditLogService_1.AUDIT_ACTIONS.LEAD_CREATED,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getEntityId: (req, res) => { var _a; return (_a = res.locals) === null || _a === void 0 ? void 0 : _a.createdLeadId; },
        getDescription: (req) => `Created lead: ${req.body.companyName || req.body.url}`,
    },
    LEAD_UPDATE: {
        action: auditLogService_1.AUDIT_ACTIONS.LEAD_UPDATED,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getEntityId: (req) => req.params.id,
        getDescription: (req) => `Updated lead: ${req.body.companyName || req.params.id}`,
    },
    LEAD_DELETE: {
        action: auditLogService_1.AUDIT_ACTIONS.LEAD_DELETED,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getEntityId: (req) => req.params.id,
        getDescription: (req) => `Deleted lead: ${req.params.id}`,
    },
    LEAD_SCORE: {
        action: auditLogService_1.AUDIT_ACTIONS.LEAD_SCORED,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getEntityId: (req) => req.params.id,
        getDescription: (req) => `Scored lead: ${req.params.id}`,
    },
    LEAD_ENRICH: {
        action: auditLogService_1.AUDIT_ACTIONS.LEAD_ENRICHED,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getEntityId: (req) => req.params.id,
        getDescription: (req) => `Enriched lead: ${req.params.id}`,
    },
    // Campaign operations
    CAMPAIGN_CREATE: {
        action: auditLogService_1.AUDIT_ACTIONS.CAMPAIGN_CREATED,
        entityType: auditLogService_1.ENTITY_TYPES.CAMPAIGN,
        getEntityId: (req, res) => { var _a; return (_a = res.locals) === null || _a === void 0 ? void 0 : _a.createdCampaignId; },
        getDescription: (req) => `Created campaign: ${req.body.name}`,
    },
    CAMPAIGN_UPDATE: {
        action: auditLogService_1.AUDIT_ACTIONS.CAMPAIGN_UPDATED,
        entityType: auditLogService_1.ENTITY_TYPES.CAMPAIGN,
        getEntityId: (req) => req.params.id,
        getDescription: (req) => `Updated campaign: ${req.body.name || req.params.id}`,
    },
    CAMPAIGN_DELETE: {
        action: auditLogService_1.AUDIT_ACTIONS.CAMPAIGN_DELETED,
        entityType: auditLogService_1.ENTITY_TYPES.CAMPAIGN,
        getEntityId: (req) => req.params.id,
        getDescription: (req) => `Deleted campaign: ${req.params.id}`,
    },
    // User operations
    USER_LOGIN: {
        action: auditLogService_1.AUDIT_ACTIONS.USER_LOGIN,
        entityType: auditLogService_1.ENTITY_TYPES.USER,
        getEntityId: (req, res) => { var _a; return (_a = res.locals) === null || _a === void 0 ? void 0 : _a.userId; },
        getDescription: (req) => `User login: ${req.body.email}`,
    },
    USER_LOGOUT: {
        action: auditLogService_1.AUDIT_ACTIONS.USER_LOGOUT,
        entityType: auditLogService_1.ENTITY_TYPES.USER,
        getEntityId: (req) => { var _a; return (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; },
        getDescription: (req) => { var _a; return `User logout: ${(_a = req.user) === null || _a === void 0 ? void 0 : _a.email}`; },
    },
    // Bulk operations
    BULK_LEAD_UPDATE: {
        action: auditLogService_1.AUDIT_ACTIONS.BULK_LEAD_UPDATE,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getDescription: (req) => { var _a; return `Bulk updated ${((_a = req.body.leadIds) === null || _a === void 0 ? void 0 : _a.length) || 0} leads`; },
        getMetadata: (req) => ({
            leadIds: req.body.leadIds,
            updates: req.body.updates,
        }),
    },
    BULK_LEAD_DELETE: {
        action: auditLogService_1.AUDIT_ACTIONS.BULK_LEAD_DELETE,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getDescription: (req) => { var _a; return `Bulk deleted ${((_a = req.body.leadIds) === null || _a === void 0 ? void 0 : _a.length) || 0} leads`; },
        getMetadata: (req) => ({
            leadIds: req.body.leadIds,
        }),
    },
    BULK_ENRICHMENT: {
        action: auditLogService_1.AUDIT_ACTIONS.BULK_ENRICHMENT,
        entityType: auditLogService_1.ENTITY_TYPES.LEAD,
        getDescription: (req) => { var _a; return `Bulk enriched ${((_a = req.body.leadIds) === null || _a === void 0 ? void 0 : _a.length) || 0} leads`; },
        getMetadata: (req) => ({
            leadIds: req.body.leadIds,
        }),
    },
};
