import { Request, Response, NextFunction } from 'express';
import { AuditLogService, AUDIT_ACTIONS, ENTITY_TYPES } from '../services/auditLogService';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  getEntityId?: (req: Request, res: Response) => string | undefined;
  getDescription?: (req: Request, res: Response) => string;
  getMetadata?: (req: Request, res: Response) => Record<string, any> | undefined;
  skipOnError?: boolean;
}

/**
 * Middleware to automatically log audit activities
 */
export const auditLog = (options: AuditLogOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;

    let responseBody: any;
    let statusCode: number = 200;

    // Override response methods to capture response data
    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    res.status = function(code: number) {
      statusCode = code;
      return originalStatus.call(this, code);
    };

    // Continue to next middleware
    next();

    // Log the activity after the request is processed
    try {
      const userId = (req as any).user?.id;
      const entityId = options.getEntityId ? options.getEntityId(req, res) : undefined;
      const description = options.getDescription ? options.getDescription(req, res) : options.action;
      const metadata = options.getMetadata ? options.getMetadata(req, res) : undefined;

      // Only log successful operations unless skipOnError is false
      if (statusCode >= 200 && statusCode < 300) {
        await AuditLogService.logActivity({
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
    } catch (error) {
      console.error('Failed to log audit activity:', error);
      // Don't throw - audit logging should not break main functionality
    }
  };
};

/**
 * Manual audit logging function for complex scenarios
 */
export const logAuditActivity = async (
  action: string,
  entityType: string,
  description: string,
  userId?: string,
  entityId?: string,
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) => {
  await AuditLogService.logActivity({
    action,
    entityType,
    entityId,
    description,
    userId,
    metadata,
    ipAddress,
    userAgent,
  });
};

/**
 * Common audit log configurations
 */
export const AUDIT_CONFIGS = {
  // Lead operations
  LEAD_CREATE: {
    action: AUDIT_ACTIONS.LEAD_CREATED,
    entityType: ENTITY_TYPES.LEAD,
    getEntityId: (req: Request, res: Response) => res.locals?.createdLeadId,
    getDescription: (req: Request) => `Created lead: ${req.body.companyName || req.body.url}`,
  },
  
  LEAD_UPDATE: {
    action: AUDIT_ACTIONS.LEAD_UPDATED,
    entityType: ENTITY_TYPES.LEAD,
    getEntityId: (req: Request) => req.params.id,
    getDescription: (req: Request) => `Updated lead: ${req.body.companyName || req.params.id}`,
  },
  
  LEAD_DELETE: {
    action: AUDIT_ACTIONS.LEAD_DELETED,
    entityType: ENTITY_TYPES.LEAD,
    getEntityId: (req: Request) => req.params.id,
    getDescription: (req: Request) => `Deleted lead: ${req.params.id}`,
  },
  
  LEAD_SCORE: {
    action: AUDIT_ACTIONS.LEAD_SCORED,
    entityType: ENTITY_TYPES.LEAD,
    getEntityId: (req: Request) => req.params.id,
    getDescription: (req: Request) => `Scored lead: ${req.params.id}`,
  },
  
  LEAD_ENRICH: {
    action: AUDIT_ACTIONS.LEAD_ENRICHED,
    entityType: ENTITY_TYPES.LEAD,
    getEntityId: (req: Request) => req.params.id,
    getDescription: (req: Request) => `Enriched lead: ${req.params.id}`,
  },
  
  // Campaign operations
  CAMPAIGN_CREATE: {
    action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
    entityType: ENTITY_TYPES.CAMPAIGN,
    getEntityId: (req: Request, res: Response) => res.locals?.createdCampaignId,
    getDescription: (req: Request) => `Created campaign: ${req.body.name}`,
  },
  
  CAMPAIGN_UPDATE: {
    action: AUDIT_ACTIONS.CAMPAIGN_UPDATED,
    entityType: ENTITY_TYPES.CAMPAIGN,
    getEntityId: (req: Request) => req.params.id,
    getDescription: (req: Request) => `Updated campaign: ${req.body.name || req.params.id}`,
  },
  
  CAMPAIGN_DELETE: {
    action: AUDIT_ACTIONS.CAMPAIGN_DELETED,
    entityType: ENTITY_TYPES.CAMPAIGN,
    getEntityId: (req: Request) => req.params.id,
    getDescription: (req: Request) => `Deleted campaign: ${req.params.id}`,
  },
  
  // User operations
  USER_LOGIN: {
    action: AUDIT_ACTIONS.USER_LOGIN,
    entityType: ENTITY_TYPES.USER,
    getEntityId: (req: Request, res: Response) => res.locals?.userId,
    getDescription: (req: Request) => `User login: ${req.body.email}`,
  },
  
  USER_LOGOUT: {
    action: AUDIT_ACTIONS.USER_LOGOUT,
    entityType: ENTITY_TYPES.USER,
    getEntityId: (req: Request) => (req as any).user?.id,
    getDescription: (req: Request) => `User logout: ${(req as any).user?.email}`,
  },
  
  // Bulk operations
  BULK_LEAD_UPDATE: {
    action: AUDIT_ACTIONS.BULK_LEAD_UPDATE,
    entityType: ENTITY_TYPES.LEAD,
    getDescription: (req: Request) => `Bulk updated ${req.body.leadIds?.length || 0} leads`,
    getMetadata: (req: Request) => ({
      leadIds: req.body.leadIds,
      updates: req.body.updates,
    }),
  },
  
  BULK_LEAD_DELETE: {
    action: AUDIT_ACTIONS.BULK_LEAD_DELETE,
    entityType: ENTITY_TYPES.LEAD,
    getDescription: (req: Request) => `Bulk deleted ${req.body.leadIds?.length || 0} leads`,
    getMetadata: (req: Request) => ({
      leadIds: req.body.leadIds,
    }),
  },
  
  BULK_ENRICHMENT: {
    action: AUDIT_ACTIONS.BULK_ENRICHMENT,
    entityType: ENTITY_TYPES.LEAD,
    getDescription: (req: Request) => `Bulk enriched ${req.body.leadIds?.length || 0} leads`,
    getMetadata: (req: Request) => ({
      leadIds: req.body.leadIds,
    }),
  },
} as const; 