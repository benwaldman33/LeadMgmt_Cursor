import React, { useEffect, useState } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { webSocketService } from '../services/websocketService';
import type { NotificationData, WebSocketConnection } from '../services/websocketService';
import { useNotifications } from '../contexts/NotificationContext';

interface RealTimeNotificationsProps {
  className?: string;
}

const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnection>({ connected: false });
  const [isOpen, setIsOpen] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Subscribe to WebSocket notifications
    const unsubscribeNotifications = webSocketService.onNotification((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
      
      // Show toast notification with better type mapping
      const toastType = getToastType(notification.type);
      addNotification({
        type: toastType,
        title: notification.title,
        message: notification.message
      });
    });

    // Subscribe to connection status changes
    const unsubscribeConnection = webSocketService.onConnectionChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeConnection();
    };
  }, [addNotification]);

  const getToastType = (notificationType: NotificationData['type']) => {
    switch (notificationType) {
      case 'lead_created':
      case 'campaign_created':
        return 'success';
      case 'lead_updated':
      case 'lead_assigned':
      case 'lead_scored':
        return 'info';
      case 'user_activity':
        return 'info';
      case 'pipeline_started':
      case 'pipeline_progress':
        return 'info';
      case 'pipeline_completed':
        return 'success';
      case 'pipeline_failed':
        return 'error';
      default:
        return 'info';
    }
  };

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
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
      case 'pipeline_started':
        return '🚀';
      case 'pipeline_progress':
        return '⏳';
      case 'pipeline_completed':
        return '✅';
      case 'pipeline_failed':
        return '❌';
      default:
        return '🔔';
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Connection Status Indicator */}
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {connectionStatus.connected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {/* Notifications Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Real-time Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 pr-8">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced close button for each notification */}
                    <button
                      onClick={() => removeNotification(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all duration-200"
                      aria-label="Remove notification"
                      title="Remove notification"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setNotifications([])}
                className="w-full text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeNotifications; 