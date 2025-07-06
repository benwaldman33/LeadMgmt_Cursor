import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuditLogService, formatAuditAction, getActionIcon, getActionColor, formatTimestamp } from '../services/auditLogService';
import type { AuditLog } from '../services/auditLogService';

interface ActivityFeedProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  limit = 10, 
  showFilters = false, 
  className = '' 
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['recentActivity', limit],
    queryFn: () => AuditLogService.getRecentActivity(limit),
  });

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Failed to load activity feed</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-500 mt-1">Latest actions and updates</p>
      </div>
      
      <div className="p-6">
        {data?.logs && data.logs.length > 0 ? (
          <div className="space-y-4">
            {data.logs.map((log: AuditLog) => (
              <ActivityItem key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ActivityItemProps {
  log: AuditLog;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ log }) => {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getActionColor(log.action)}`}>
          {getActionIcon(log.action)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {log.description}
          </p>
          <span className="text-xs text-gray-500">
            {formatTimestamp(log.createdAt)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)} bg-opacity-10`}>
            {formatAuditAction(log.action)}
          </span>
          
          {log.user && (
            <span className="text-xs text-gray-500">
              by {log.user.fullName}
            </span>
          )}
          
          {log.entityType && log.entityId && (
            <span className="text-xs text-gray-400">
              • {log.entityType.toLowerCase()} #{log.entityId.slice(-8)}
            </span>
          )}
        </div>
        
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <details>
              <summary className="cursor-pointer hover:text-gray-800">
                View details
              </summary>
              <pre className="mt-1 whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed; 