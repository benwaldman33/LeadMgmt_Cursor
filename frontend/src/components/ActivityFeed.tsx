import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuditLogService } from '../services/auditLogService';
import {
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface ActivityFeedProps {
  limit?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ limit = 10 }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditLogs', limit],
    queryFn: () => AuditLogService.getAuditLogs({ limit }),
  });

  // Patch: ensure logs is always an array
  const safeLogs = Array.isArray(logs) ? logs : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!safeLogs || safeLogs.length === 0) {
    return (
      <div className="text-center py-8">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No activity</h3>
        <p className="mt-1 text-sm text-gray-500">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeLogs.map((log: any) => (
        <div key={log.id} className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CogIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {log.action}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {log.resourceType}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {log.description || log.action}
              </p>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-3 w-3" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                
                {log.user && (
                  <div className="flex items-center space-x-1">
                    <UserIcon className="h-3 w-3" />
                    <span>
                      by {log.user.fullName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed; 