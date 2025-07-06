import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchService } from '../services/searchService';
import type { FilterOptions } from '../services/searchService';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface AdvancedFiltersProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  filterTypes: string[];
  className?: string;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  filterTypes,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(filters);

  const { data: filterOptions } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: () => SearchService.getFilterOptions(),
    staleTime: 300000, // 5 minutes
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter(key => 
      filters[key] !== '' && filters[key] !== null && filters[key] !== undefined
    ).length;
  };

  const renderFilterField = (type: string) => {
    switch (type) {
      case 'status':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {filterOptions?.leadStatuses?.map((status: any) => (
                <option key={status.value} value={status.value}>
                  {status.value} ({status.count})
                </option>
              ))}
            </select>
          </div>
        );

      case 'campaign':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Campaign
            </label>
            <select
              value={localFilters.campaignId || ''}
              onChange={(e) => handleFilterChange('campaignId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Campaigns</option>
              {filterOptions?.campaigns?.map((campaign: any) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'assignedTo':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Assigned To
            </label>
            <select
              value={localFilters.assignedToId || ''}
              onChange={(e) => handleFilterChange('assignedToId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              {filterOptions?.users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'assignedTeam':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Assigned Team
            </label>
            <select
              value={localFilters.assignedTeamId || ''}
              onChange={(e) => handleFilterChange('assignedTeamId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Teams</option>
              {filterOptions?.teams?.map((team: any) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'industry':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Industry
            </label>
            <select
              value={localFilters.industry || ''}
              onChange={(e) => handleFilterChange('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Industries</option>
              {filterOptions?.industries?.map((industry: any) => (
                <option key={industry.value} value={industry.value}>
                  {industry.value} ({industry.count})
                </option>
              ))}
            </select>
          </div>
        );

      case 'scoreRange':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Score Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                min="0"
                max="100"
                value={localFilters.scoreMin || ''}
                onChange={(e) => handleFilterChange('scoreMin', e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max"
                min="0"
                max="100"
                value={localFilters.scoreMax || ''}
                onChange={(e) => handleFilterChange('scoreMax', e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'dateRange':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={localFilters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'enrichment':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Enrichment Status
            </label>
            <select
              value={localFilters.enriched || ''}
              onChange={(e) => handleFilterChange('enriched', e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Enriched</option>
              <option value="false">Not Enriched</option>
            </select>
          </div>
        );

      case 'scoring':
        return (
          <div key={type} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Scoring Status
            </label>
            <select
              value={localFilters.scored || ''}
              onChange={(e) => handleFilterChange('scored', e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="true">Scored</option>
              <option value="false">Not Scored</option>
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <FunnelIcon className="h-4 w-4 mr-2" />
        Filters
        {getActiveFilterCount() > 0 && (
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {getActiveFilterCount()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {filterTypes.map(renderFilterField)}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters; 