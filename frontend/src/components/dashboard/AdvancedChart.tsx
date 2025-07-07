import React, { useState } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  ChartBarSquareIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface AdvancedChartProps {
  data: ChartDataPoint[];
  title: string;
  type: 'bar' | 'pie' | 'line' | 'funnel';
  height?: number;
  className?: string;
  showPercentages?: boolean;
  showValues?: boolean;
  colorScheme?: 'default' | 'blue' | 'green' | 'purple' | 'orange';
}

export const AdvancedChart: React.FC<AdvancedChartProps> = ({
  data,
  title,
  type,
  height = 300,
  className = '',
  showPercentages = true,
  showValues = true,
  colorScheme = 'default'
}) => {
  const [selectedDataPoint, setSelectedDataPoint] = useState<ChartDataPoint | null>(null);

  const getColorClasses = (index: number, color?: string) => {
    if (color) return color;
    
    const colors = {
      default: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'],
      blue: ['bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800'],
      green: ['bg-green-400', 'bg-green-500', 'bg-green-600', 'bg-green-700', 'bg-green-800'],
      purple: ['bg-purple-400', 'bg-purple-500', 'bg-purple-600', 'bg-purple-700', 'bg-purple-800'],
      orange: ['bg-orange-400', 'bg-orange-500', 'bg-orange-600', 'bg-orange-700', 'bg-orange-800'],
    };
    
    return colors[colorScheme][index % colors[colorScheme].length];
  };

  const getIcon = () => {
    switch (type) {
      case 'bar':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'pie':
        return <ChartPieIcon className="h-5 w-5" />;
      case 'line':
        return <ChartBarSquareIcon className="h-5 w-5" />;
      case 'funnel':
        return <FunnelIcon className="h-5 w-5" />;
      default:
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map(item => item.value));

  const renderBarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.label}</span>
              <div className="flex items-center space-x-2">
                {showValues && <span className="text-gray-600">{item.value}</span>}
                {showPercentages && <span className="text-gray-500">({percentage.toFixed(1)}%)</span>}
              </div>
            </div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getColorClasses(index)} transition-all duration-300 hover:opacity-80 cursor-pointer`}
                style={{ width: `${barWidth}%` }}
                onMouseEnter={() => setSelectedDataPoint(item)}
                onMouseLeave={() => setSelectedDataPoint(null)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPieChart = () => {
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center">
        <svg width="200" height="200" className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) : 0;
            const angle = percentage * 2 * Math.PI;
            const endAngle = currentAngle + angle;
            
            const x1 = centerX + radius * Math.cos(currentAngle);
            const y1 = centerY + radius * Math.sin(currentAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);
            
            const largeArcFlag = angle > Math.PI ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            currentAngle = endAngle;

            return (
              <path
                key={index}
                d={pathData}
                fill={getColorClasses(index).replace('bg-', '').replace('-500', '')}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                onMouseEnter={() => setSelectedDataPoint(item)}
                onMouseLeave={() => setSelectedDataPoint(null)}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  const renderFunnelChart = () => (
    <div className="space-y-2">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const width = 100 - (index * 15); // Decreasing width for funnel effect
        
        return (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-1">
              <div className="relative">
                <div
                  className={`h-8 ${getColorClasses(index)} rounded-md transition-all duration-300 hover:opacity-80`}
                  style={{ width: `${width}%` }}
                  onMouseEnter={() => setSelectedDataPoint(item)}
                  onMouseLeave={() => setSelectedDataPoint(null)}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-sm font-medium text-white">{item.label}</span>
                  <div className="flex items-center space-x-2">
                    {showValues && <span className="text-sm text-white">{item.value}</span>}
                    {showPercentages && <span className="text-xs text-white opacity-90">({percentage.toFixed(1)}%)</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'funnel':
        return renderFunnelChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`} style={{ height }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {selectedDataPoint && (
          <div className="text-xs text-gray-500">
            {selectedDataPoint.label}: {selectedDataPoint.value}
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          {renderChart()}
        </div>
      )}

      {/* Legend */}
      {type === 'pie' && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${getColorClasses(index)}`} />
              <span className="text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedChart; 