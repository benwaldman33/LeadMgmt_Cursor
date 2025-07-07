import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessRuleService } from '../services/businessRuleService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const BusinessRulesPage: React.FC = () => {
  const [filters, setFilters] = useState({
    isActive: '',
    type: '',
    search: '',
  });
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  // Fetch business rules
  const { data: businessRules, isLoading, error } = useQuery({
    queryKey: ['business-rules', filters],
    queryFn: () => new BusinessRuleService().getBusinessRules({
      isActive: filters.isActive === 'true' ? true : filters.isActive === 'false' ? false : undefined,
      type: filters.type || undefined,
    }),
  });

  // Fetch business rule stats
  const { data: stats } = useQuery({
    queryKey: ['business-rule-stats'],
    queryFn: () => new BusinessRuleService().getBusinessRuleStats(),
  });

  // Mutations
  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => new BusinessRuleService().deleteBusinessRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
      queryClient.invalidateQueries({ queryKey: ['business-rule-stats'] });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Business rule deleted successfully'
      });
    },
    onError: (error: Error) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete business rule'
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      new BusinessRuleService().updateBusinessRule(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
      queryClient.invalidateQueries({ queryKey: ['business-rule-stats'] });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Business rule status updated'
      });
    },
    onError: (error: Error) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update business rule'
      });
    },
  });

  const handleDeleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this business rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleToggleRule = (id: string, currentStatus: boolean) => {
    toggleRuleMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedRules.length} business rules?`)) {
      selectedRules.forEach(id => deleteRuleMutation.mutate(id));
      setSelectedRules([]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRules.length === businessRules?.length) {
      setSelectedRules([]);
    } else {
      setSelectedRules(businessRules?.map(r => r.id) || []);
    }
  };

  const filteredRules = businessRules?.filter(rule => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description?.toLowerCase().includes(searchLower) ||
        rule.type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <XMarkIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading business rules</h3>
        <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Rules</h1>
          <p className="text-gray-600">Automate lead processing with intelligent business rules</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/business-rules/test"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Test Rules
          </Link>
          <Link
            to="/business-rules/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Rule
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Rules</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRules}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeRules}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactiveRules}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Rule Types</p>
                <p className="text-2xl font-bold text-gray-900">{stats.ruleTypes.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <CheckIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search rules..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              {BusinessRuleService.getAvailableActionTypes().map(type => (
                <option key={type.value} value={type.value}>
                  {BusinessRuleService.formatRuleType(type.value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ isActive: '', type: '', search: '' })}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRules.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">
              {selectedRules.length} rule(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Business Rules Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Business Rules</h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedRules.length === businessRules?.length && businessRules.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500">Select All</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading business rules...</p>
          </div>
        ) : filteredRules?.length === 0 ? (
          <div className="text-center py-12">
            <CheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No business rules found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.isActive || filters.type
                ? 'Try adjusting your filters.'
                : 'Get started by creating your first business rule.'}
            </p>
            {!filters.search && !filters.isActive && !filters.type && (
              <div className="mt-6">
                <Link
                  to="/business-rules/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Rule
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedRules.length === businessRules?.length && businessRules.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conditions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRules?.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRules.includes(rule.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRules([...selectedRules, rule.id]);
                          } else {
                            setSelectedRules(selectedRules.filter(id => id !== rule.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-gray-500">{rule.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {BusinessRuleService.formatRuleType(rule.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.isActive)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rule.isActive ? (
                          <>
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.priority >= 80 ? 'bg-red-100 text-red-800' :
                        rule.priority >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {rule.priority || 50}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.conditions?.length || 0} conditions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.actions?.length || 0} actions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rule.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/business-rules/${rule.id}`}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/business-rules/${rule.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Rule"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Rule"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessRulesPage; 