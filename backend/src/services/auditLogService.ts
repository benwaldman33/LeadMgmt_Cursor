import { prisma } from '../index';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  userId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogService {
  /**
   * Log an activity to the audit log
   */
  static async logActivity(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          description: data.description,
          userId: data.userId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log audit activity:', error);
      // Don't throw - audit logging should not break main functionality
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(filters: AuditLogFilters = {}) {
    const where: any = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    const total = await prisma.auditLog.count({ where });

    return {
      logs: logs.map((log: any) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total,
      hasMore: total > (filters.offset || 0) + (filters.limit || 50),
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(entityType: string, entityId: string) {
    return this.getAuditLogs({
      entityType,
      entityId,
      limit: 100,
    });
  }

  /**
   * Get recent activity for dashboard
   */
  static async getRecentActivity(limit: number = 10) {
    return this.getAuditLogs({
      limit,
    });
  }

  /**
   * Get user activity
   */
  static async getUserActivity(userId: string, limit: number = 50) {
    return this.getAuditLogs({
      userId,
      limit,
    });
  }

  /**
   * Get activity summary for dashboard
   */
  static async getActivitySummary() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [todayCount, yesterdayCount, lastWeekCount, totalCount] = await Promise.all([
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: yesterday,
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: lastWeek,
          },
        },
      }),
      prisma.auditLog.count(),
    ]);

    // Get top actions
    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
      take: 5,
    });

    return {
      todayCount,
      yesterdayCount,
      lastWeekCount,
      totalCount,
      topActions: topActions.map((action: any) => ({
        action: action.action,
        count: action._count.action,
      })),
    };
  }
}

// Common audit log actions
export const AUDIT_ACTIONS = {
  // Lead actions
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  LEAD_DELETED: 'LEAD_DELETED',
  LEAD_SCORED: 'LEAD_SCORED',
  LEAD_ENRICHED: 'LEAD_ENRICHED',
  LEAD_ASSIGNED: 'LEAD_ASSIGNED',
  LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED',
  
  // Campaign actions
  CAMPAIGN_CREATED: 'CAMPAIGN_CREATED',
  CAMPAIGN_UPDATED: 'CAMPAIGN_UPDATED',
  CAMPAIGN_DELETED: 'CAMPAIGN_DELETED',
  CAMPAIGN_STATUS_CHANGED: 'CAMPAIGN_STATUS_CHANGED',
  
  // Scoring actions
  SCORING_MODEL_CREATED: 'SCORING_MODEL_CREATED',
  SCORING_MODEL_UPDATED: 'SCORING_MODEL_UPDATED',
  SCORING_MODEL_DELETED: 'SCORING_MODEL_DELETED',
  BULK_SCORING_RUN: 'BULK_SCORING_RUN',
  
  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // Bulk operations
  BULK_LEAD_UPDATE: 'BULK_LEAD_UPDATE',
  BULK_LEAD_DELETE: 'BULK_LEAD_DELETE',
  BULK_ENRICHMENT: 'BULK_ENRICHMENT',
  
  // System actions
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  SYSTEM_RESTORE: 'SYSTEM_RESTORE',
  DATA_IMPORT: 'DATA_IMPORT',
  DATA_EXPORT: 'DATA_EXPORT',
} as const;

// Entity types
export const ENTITY_TYPES = {
  LEAD: 'LEAD',
  CAMPAIGN: 'CAMPAIGN',
  SCORING_MODEL: 'SCORING_MODEL',
  USER: 'USER',
  TEAM: 'TEAM',
  SYSTEM: 'SYSTEM',
} as const; 