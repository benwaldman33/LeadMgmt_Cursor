import React, { useEffect, useState } from 'react';
import { ClockIcon, UserIcon, BellIcon } from '@heroicons/react/24/outline';
import { webSocketService } from '../services/websocketService';
import type { NotificationData } from '../services/websocketService';

interface LiveActivityFeedProps {
  className?: string;
  maxItems?: number;
}

interface ActivityItem {
  id: string;
  type: NotificationData['type'];
  title: string;
  message: string;
  timestamp: Date;
  icon: string;
  color: string;
}

const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ 
  className = '', 
  maxItems = 10 
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Subscribe to WebSocket notifications
    const unsubscribeNotifications = webSocketService.onNotification((notification) => {
      const activityItem: ActivityItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(notification.timestamp),
        icon: getActivityIcon(notification.type),
        color: getActivityColor(notification.type),
      };

      setActivities(prev => [activityItem, ...prev.slice(0, maxItems - 1)]);
    });

    // Subscribe to connection status changes
    const unsubscribeConnection = webSocketService.onConnectionChange((status) => {
      setIsLive(status.connected);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeConnection();
    };
  }, [maxItems]);

  const getActivityIcon = (type: NotificationData['type']): string => {
    switch (type) {
      case 'lead_created':
        return '🆕';
      case 'lead_updated':
        return '✏️';
      case 'lead_assigned':
        return '👤';
      case 'lead_scored':
        return '📊';
      case 'campaign_created':
        return '📢';
      case 'user_activity':
        return '👥';
      default:
        return '🔔';
    }
  };

  const getActivityColor = (type: NotificationData['type']): string => {
    switch (type) {
      case 'lead_created':
        return 'bg-green-100 text-green-800';
      case 'lead_updated':
        return 'bg-blue-100 text-blue-800';
      case 'lead_assigned':
        return 'bg-purple-100 text-purple-800';
      case 'lead_scored':
        return 'bg-yellow-100 text-yellow-800';
      case 'campaign_created':
        return 'bg-indigo-100 text-indigo-800';
      case 'user_activity':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isLive ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No activity yet</p>
            <p className="text-sm">Activities will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{activities.length} recent activities</span>
            <button
              onClick={() => setActivities([])}
              className="text-gray-400 hover:text-gray-600"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveActivityFeed; 