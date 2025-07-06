import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuditLogService, formatAuditAction, getActionIcon, getActionColor, formatTimestamp } from '../services/auditLogService';
import type { AuditLog, AuditLogFilters } from '../services/auditLogService';

const AuditLogsPage: React.FC = () => {
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => AuditLogService.getAuditLogs(filters),
  });

  const { data: actionsData } = useQuery({
    queryKey: ['auditActions'],
    queryFn: () => AuditLogService.getAuditActions(),
  });

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset offset when filters change
    }));
  };

  const loadMore = () => {
    if (data?.hasMore) {
      setFilters(prev => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 50),
      }));
    }
  };

  const clearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-gray-600">Track all system activities and user actions</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {actionsData?.actions.map((action) => (
                    <option key={action} value={action}>
                      {formatAuditAction(action)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <select
                  value={filters.entityType || ''}
                  onChange={(e) => handleFilterChange('entityType', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {actionsData?.entityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>

              <div className="text-sm text-gray-500">
                {data?.total ? `${data.total} total entries` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-gray-500">
              <p>Failed to load audit logs</p>
            </div>
          ) : (
            <div className="p-6">
              {data?.logs && data.logs.length > 0 ? (
                <div className="space-y-4">
                  {data.logs.map((log: AuditLog) => (
                    <AuditLogItem key={log.id} log={log} />
                  ))}
                  
                  {data.hasMore && (
                    <div className="text-center pt-4">
                      <button
                        onClick={loadMore}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-500">No audit logs found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AuditLogItemProps {
  log: AuditLog;
}

const AuditLogItem: React.FC<AuditLogItemProps> = ({ log }) => {
  return (
    <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActionColor(log.action)}`}>
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
        
        <div className="flex items-center space-x-2 mt-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)} bg-opacity-10`}>
            {formatAuditAction(log.action)}
          </span>
          
          {log.user && (
            <span className="text-xs text-gray-500">
              by {log.user.fullName} ({log.user.email})
            </span>
          )}
          
          {log.entityType && log.entityId && (
            <span className="text-xs text-gray-400">
              • {log.entityType.toLowerCase()} #{log.entityId.slice(-8)}
            </span>
          )}
        </div>
        
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
            <details>
              <summary className="cursor-pointer hover:text-gray-800 font-medium">
                View metadata
              </summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        {log.ipAddress && (
          <div className="mt-2 text-xs text-gray-400">
            IP: {log.ipAddress}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage; 