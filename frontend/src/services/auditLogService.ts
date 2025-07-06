import api from './api';

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  hasMore: boolean;
}

export interface ActivitySummary {
  todayCount: number;
  yesterdayCount: number;
  lastWeekCount: number;
  totalCount: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

export class AuditLogService {
  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/audit-logs?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get recent activity for dashboard
   */
  static async getRecentActivity(limit: number = 10): Promise<AuditLogResponse> {
    const response = await api.get(`/audit-logs/recent?limit=${limit}`);
    return response.data.data;
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(
    entityType: string, 
    entityId: string, 
    limit: number = 50
  ): Promise<AuditLogResponse> {
    const response = await api.get(
      `/audit-logs/entity/${entityType}/${entityId}?limit=${limit}`
    );
    return response.data.data;
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserActivity(
    userId: string, 
    limit: number = 50
  ): Promise<AuditLogResponse> {
    const response = await api.get(
      `/audit-logs/user/${userId}?limit=${limit}`
    );
    return response.data.data;
  }

  /**
   * Get activity summary for dashboard
   */
  static async getActivitySummary(): Promise<ActivitySummary> {
    const response = await api.get('/audit-logs/summary');
    return response.data.data;
  }

  /**
   * Get available audit actions and entity types
   */
  static async getAuditActions(): Promise<{
    actions: string[];
    entityTypes: string[];
  }> {
    const response = await api.get('/audit-logs/actions');
    return response.data.data;
  }
}

// Helper functions for formatting audit logs
export const formatAuditAction = (action: string): string => {
  return action
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export const getActionIcon = (action: string): string => {
  const actionIcons: Record<string, string> = {
    // Lead actions
    LEAD_CREATED: '📝',
    LEAD_UPDATED: '✏️',
    LEAD_DELETED: '🗑️',
    LEAD_SCORED: '🎯',
    LEAD_ENRICHED: '🔍',
    LEAD_ASSIGNED: '👤',
    LEAD_STATUS_CHANGED: '🔄',
    
    // Campaign actions
    CAMPAIGN_CREATED: '📊',
    CAMPAIGN_UPDATED: '✏️',
    CAMPAIGN_DELETED: '🗑️',
    CAMPAIGN_STATUS_CHANGED: '🔄',
    
    // Scoring actions
    SCORING_MODEL_CREATED: '🧮',
    SCORING_MODEL_UPDATED: '✏️',
    SCORING_MODEL_DELETED: '🗑️',
    BULK_SCORING_RUN: '🎯',
    
    // User actions
    USER_LOGIN: '🔑',
    USER_LOGOUT: '🚪',
    USER_CREATED: '👤',
    USER_UPDATED: '✏️',
    USER_DELETED: '🗑️',
    
    // Bulk operations
    BULK_LEAD_UPDATE: '📝',
    BULK_LEAD_DELETE: '🗑️',
    BULK_ENRICHMENT: '🔍',
    
    // System actions
    SYSTEM_BACKUP: '💾',
    SYSTEM_RESTORE: '🔄',
    DATA_IMPORT: '📥',
    DATA_EXPORT: '📤',
  };

  return actionIcons[action] || '📋';
};

export const getActionColor = (action: string): string => {
  const actionColors: Record<string, string> = {
    // Lead actions
    LEAD_CREATED: 'text-green-600',
    LEAD_UPDATED: 'text-blue-600',
    LEAD_DELETED: 'text-red-600',
    LEAD_SCORED: 'text-purple-600',
    LEAD_ENRICHED: 'text-orange-600',
    LEAD_ASSIGNED: 'text-indigo-600',
    LEAD_STATUS_CHANGED: 'text-yellow-600',
    
    // Campaign actions
    CAMPAIGN_CREATED: 'text-green-600',
    CAMPAIGN_UPDATED: 'text-blue-600',
    CAMPAIGN_DELETED: 'text-red-600',
    CAMPAIGN_STATUS_CHANGED: 'text-yellow-600',
    
    // Scoring actions
    SCORING_MODEL_CREATED: 'text-green-600',
    SCORING_MODEL_UPDATED: 'text-blue-600',
    SCORING_MODEL_DELETED: 'text-red-600',
    BULK_SCORING_RUN: 'text-purple-600',
    
    // User actions
    USER_LOGIN: 'text-green-600',
    USER_LOGOUT: 'text-gray-600',
    USER_CREATED: 'text-green-600',
    USER_UPDATED: 'text-blue-600',
    USER_DELETED: 'text-red-600',
    
    // Bulk operations
    BULK_LEAD_UPDATE: 'text-blue-600',
    BULK_LEAD_DELETE: 'text-red-600',
    BULK_ENRICHMENT: 'text-orange-600',
    
    // System actions
    SYSTEM_BACKUP: 'text-green-600',
    SYSTEM_RESTORE: 'text-blue-600',
    DATA_IMPORT: 'text-green-600',
    DATA_EXPORT: 'text-blue-600',
  };

  return actionColors[action] || 'text-gray-600';
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  }
}; 