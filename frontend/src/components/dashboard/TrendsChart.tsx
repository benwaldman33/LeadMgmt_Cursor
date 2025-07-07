import React from 'react';
import type { LeadTrends } from '../../services/analyticsService';

interface TrendsChartProps {
  data: LeadTrends;
  title: string;
  type?: 'daily' | 'weekly' | 'monthly';
  className?: string;
}

export const TrendsChart: React.FC<TrendsChartProps> = ({
  data,
  title,
  type = 'daily',
  className = ''
}) => {
  const getChartData = () => {
    switch (type) {
      case 'daily':
        return data.daily;
      case 'weekly':
        return data.weekly;
      case 'monthly':
        return data.monthly;
      default:
        return data.daily;
    }
  };

  const chartData = getChartData();
  const maxValue = Math.max(...chartData.map(item => item.leads));
  const minValue = Math.min(...chartData.map(item => item.leads));

  const getBarHeight = (value: number) => {
    if (maxValue === minValue) return 50; // Default height if all values are the same
    return ((value - minValue) / (maxValue - minValue)) * 100;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    switch (type) {
      case 'daily':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week ${date.getDate()}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {chartData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between h-32">
            {chartData.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative w-full max-w-8">
                  <div
                    className="bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                    style={{
                      height: `${getBarHeight(item.leads)}%`,
                      minHeight: '4px'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {formatDate('date' in item ? item.date : 'week' in item ? item.week : item.month)}
                </p>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Min: {minValue}</span>
            <span>Max: {maxValue}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendsChart; 