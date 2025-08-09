import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AIScoringService } from '../services/aiScoringService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  CogIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

const ClaudeConfigPanel: React.FC = () => {
  const [config, setConfig] = useState({
    apiKey: '',
    model: 'claude-3-sonnet-20240229',
    maxTokens: '4000',
    temperature: '0.7'
  });
  const [isEditing, setIsEditing] = useState(false);

  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const aiScoringService = new AIScoringService();

  // Queries
  const { data: claudeConfig, isLoading: configLoading } = useQuery({
    queryKey: ['claude-config'],
    queryFn: () => aiScoringService.getClaudeConfig()
  });

  const { data: connectionTest, isLoading: testLoading, refetch: testConnection } = useQuery({
    queryKey: ['claude-connection-test'],
    queryFn: () => aiScoringService.testClaudeConnection(),
    enabled: false
  });

  const { data: usageStats, isLoading: usageLoading } = useQuery({
    queryKey: ['claude-usage'],
    queryFn: () => aiScoringService.getClaudeUsageStats()
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: aiScoringService.updateClaudeConfig,
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Configuration Updated',
        message: 'Claude API configuration has been updated successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['claude-config'] });
      setIsEditing(false);
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update Claude API configuration'
      });
    }
  });

  useEffect(() => {
    if (claudeConfig) {
      setConfig({
        apiKey: claudeConfig.apiKey || '',
        model: claudeConfig.model || 'claude-3-sonnet-20240229',
        maxTokens: claudeConfig.maxTokens || '4000',
        temperature: claudeConfig.temperature || '0.7'
      });
    }
  }, [claudeConfig]);

  const handleSaveConfig = () => {
    if (!config.apiKey.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Claude API key is required'
      });
      return;
    }

    updateConfigMutation.mutate({
      apiKey: config.apiKey,
      model: config.model,
      maxTokens: parseInt(config.maxTokens),
      temperature: parseFloat(config.temperature)
    });
  };

  const handleTestConnection = () => {
    testConnection();
  };

  if (configLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <CogIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Claude API Configuration</h3>
        </div>
        <div className="flex items-center space-x-2">
          {claudeConfig?.isConfigured ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-500" />
          )}
          <span className={`text-sm ${claudeConfig?.isConfigured ? 'text-green-600' : 'text-red-600'}`}>
            {claudeConfig?.isConfigured ? 'Configured' : 'Not Configured'}
          </span>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="space-y-4">
        {/* API Key Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <KeyIcon className="h-4 w-4 text-gray-500" />
              <span>Claude API Key</span>
            </div>
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            placeholder={isEditing ? "sk-ant-..." : "••••••••••••••••"}
          />
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={config.model}
            onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          >
            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            value={config.maxTokens}
            onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            min="1000"
            max="100000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperature
          </label>
          <input
            type="number"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig(prev => ({ ...prev, temperature: e.target.value }))}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            min="0"
            max="2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Lower values = more focused, Higher values = more creative
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveConfig}
                disabled={updateConfigMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Configuration
            </button>
          )}
        </div>
      </div>

      {/* Connection Test */}
      <div className="mt-8 border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Connection Test</h4>
          <button
            onClick={handleTestConnection}
            disabled={testLoading}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {testLoading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {connectionTest && (
          <div className={`p-3 rounded-md ${
            connectionTest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {connectionTest.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm ${connectionTest.success ? 'text-green-700' : 'text-red-700'}`}>
                {connectionTest.message}
              </span>
            </div>
            {connectionTest.success && (
              <div className="mt-2 text-xs text-green-600">
                Model: {connectionTest.model} | Response Time: {connectionTest.responseTime}ms
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      {usageStats && (
        <div className="mt-8 border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Usage Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Total Calls</span>
              </div>
              <div className="text-lg font-semibold text-blue-900">{usageStats.totalCalls}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Avg Response</span>
              </div>
              <div className="text-lg font-semibold text-green-900">{usageStats.averageResponseTime}ms</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600">Total Tokens</span>
              </div>
              <div className="text-lg font-semibold text-purple-900">{usageStats.totalTokens.toLocaleString()}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600">Est. Cost</span>
              </div>
              <div className="text-lg font-semibold text-yellow-900">${usageStats.costEstimate}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaudeConfigPanel; 