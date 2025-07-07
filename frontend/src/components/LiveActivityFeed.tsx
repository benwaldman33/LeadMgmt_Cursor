import React from 'react';
import {
  ClockIcon,
  UserIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface LiveActivityFeedProps {
  activities: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    user?: {
      name: string;
      email: string;
    };
  }>;
}

const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ activities }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CogIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {activity.action}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {activity.description}
              </p>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-3 w-3" />
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
                
                {activity.user && (
                  <div className="flex items-center space-x-1">
                    <UserIcon className="h-3 w-3" />
                    <span>
                      by {activity.user.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveActivityFeed; 