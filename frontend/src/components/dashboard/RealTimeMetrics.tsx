import React from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
}) => {
  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {change !== undefined && (
          <div className="flex items-center space-x-1">
            {getChangeIcon()}
            <span className={`text-sm font-medium ${
              changeType === 'increase' ? 'text-green-600' :
              changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface RealTimeMetricsProps {
  metrics: MetricCardProps[];
}

const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default RealTimeMetrics; 