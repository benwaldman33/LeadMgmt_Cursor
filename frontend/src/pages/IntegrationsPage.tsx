import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationService, IntegrationConfig, Provider, SyncResult, ConnectionTestResult } from '../services/integrationService';
import { useNotification } from '../contexts/NotificationContext';
import { PlusIcon, TrashIcon, CogIcon, ArrowPathIcon, PlayIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const IntegrationsPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();

  // Queries
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationService.getIntegrations,
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['integration-providers'],
    queryFn: integrationService.getProviders,
  });

  // Mutations
  const createIntegrationMutation = useMutation({
    mutationFn: integrationService.createIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowCreateModal(false);
      showNotification('Integration created successfully', 'success');
    },
    onError: (error: any) => {
      showNotification(error.response?.data?.error || 'Failed to create integration', 'error');
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<IntegrationConfig> }) =>
      integrationService.updateIntegration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      showNotification('Integration updated successfully', 'success');
    },
    onError: (error: any) => {
      showNotification(error.response?.data?.error || 'Failed to update integration', 'error');
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: integrationService.deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      showNotification('Integration deleted successfully', 'success');
    },
    onError: (error: any) => {
      showNotification(error.response?.data?.error || 'Failed to delete integration', 'error');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: integrationService.testConnection,
    onSuccess: (result) => {
      setTestResult(result);
      showNotification(result.success ? 'Connection test successful' : 'Connection test failed', result.success ? 'success' : 'error');
    },
    onError: (error: any) => {
      showNotification(error.response?.data?.error || 'Failed to test connection', 'error');
    },
  });

  const syncLeadsMutation = useMutation({
    mutationFn: integrationService.syncLeads,
    onSuccess: (result) => {
      setSyncResult(result);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      showNotification(
        result.success 
          ? `Sync completed: ${result.recordsCreated} created, ${result.recordsUpdated} updated`
          : 'Sync failed',
        result.success ? 'success' : 'error'
      );
    },
    onError: (error: any) => {
      showNotification(error.response?.data?.error || 'Failed to sync leads', 'error');
    },
  });

  const handleToggleIntegration = (integration: IntegrationConfig) => {
    updateIntegrationMutation.mutate({
      id: integration.id,
      updates: { isActive: !integration.isActive },
    });
  };

  const handleTestConnection = (integration: IntegrationConfig) => {
    setSelectedIntegration(integration);
    setShowTestModal(true);
    testConnectionMutation.mutate(integration.id);
  };

  const handleSyncLeads = (integration: IntegrationConfig) => {
    setSelectedIntegration(integration);
    setShowSyncModal(true);
    syncLeadsMutation.mutate(integration.id);
  };

  const handleDeleteIntegration = (integration: IntegrationConfig) => {
    if (window.confirm(`Are you sure you want to delete the integration "${integration.name}"?`)) {
      deleteIntegrationMutation.mutate(integration.id);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idle: 'bg-gray-100 text-gray-800',
      syncing: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      crm: 'bg-blue-100 text-blue-800',
      marketing: 'bg-purple-100 text-purple-800',
      email: 'bg-yellow-100 text-yellow-800',
      analytics: 'bg-green-100 text-green-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (integrationsLoading || providersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Connect with external systems and sync data</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{integrationService.getProviderIcon(integration.provider)}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.provider}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleIntegration(integration)}
                  className={`px-2 py-1 text-xs rounded-full ${
                    integration.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {integration.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(integration.type)}`}>
                  {integration.type}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(integration.syncStatus)}`}>
                  {integration.syncStatus}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Last Sync</span>
                <span className="text-sm text-gray-900">
                  {integrationService.formatLastSync(integration.lastSync)}
                </span>
              </div>

              {integration.errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {integration.errorMessage}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleTestConnection(integration)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlayIcon className="h-3 w-3 mr-1" />
                  Test
                </button>
                <button
                  onClick={() => handleSyncLeads(integration)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowPathIcon className="h-3 w-3 mr-1" />
                  Sync
                </button>
              </div>
              <button
                onClick={() => handleDeleteIntegration(integration)}
                className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12">
          <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first integration.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Integration
            </button>
          </div>
        </div>
      )}

      {/* Create Integration Modal */}
      {showCreateModal && (
        <CreateIntegrationModal
          providers={providers}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(config) => createIntegrationMutation.mutate(config)}
          isLoading={createIntegrationMutation.isPending}
        />
      )}

      {/* Test Connection Modal */}
      {showTestModal && selectedIntegration && (
        <TestConnectionModal
          integration={selectedIntegration}
          result={testResult}
          isLoading={testConnectionMutation.isPending}
          onClose={() => {
            setShowTestModal(false);
            setSelectedIntegration(null);
            setTestResult(null);
          }}
        />
      )}

      {/* Sync Results Modal */}
      {showSyncModal && selectedIntegration && (
        <SyncResultsModal
          integration={selectedIntegration}
          result={syncResult}
          isLoading={syncLeadsMutation.isPending}
          onClose={() => {
            setShowSyncModal(false);
            setSelectedIntegration(null);
            setSyncResult(null);
          }}
        />
      )}
    </div>
  );
};

// Create Integration Modal Component
interface CreateIntegrationModalProps {
  providers: Provider[];
  onClose: () => void;
  onSubmit: (config: any) => void;
  isLoading: boolean;
}

const CreateIntegrationModal: React.FC<CreateIntegrationModalProps> = ({
  providers,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'crm',
    provider: '',
    config: {} as Record<string, any>,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.provider) newErrors.provider = 'Provider is required';
    
    const configValidation = integrationService.validateConfig(formData.provider, formData.config);
    if (!configValidation.isValid) {
      configValidation.errors.forEach(error => {
        newErrors.config = error;
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const handleConfigChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  const selectedProvider = providers.find(p => p.id === formData.provider);
  const configFields = formData.provider ? integrationService.getProviderConfigFields(formData.provider) : [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Integration</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="crm">CRM</option>
                <option value="marketing">Marketing</option>
                <option value="email">Email</option>
                <option value="analytics">Analytics</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    provider: e.target.value,
                    config: {} // Reset config when provider changes
                  }));
                  setErrors({});
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a provider</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              {errors.provider && <p className="text-red-500 text-xs mt-1">{errors.provider}</p>}
            </div>

            {selectedProvider && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Configuration</label>
                <div className="mt-2 space-y-3">
                  {configFields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={formData.config[field.key] || ''}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={field.description}
                      />
                    </div>
                  ))}
                </div>
                {errors.config && <p className="text-red-500 text-xs mt-1">{errors.config}</p>}
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">Active</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Integration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Test Connection Modal Component
interface TestConnectionModalProps {
  integration: IntegrationConfig;
  result: ConnectionTestResult | null;
  isLoading: boolean;
  onClose: () => void;
}

const TestConnectionModal: React.FC<TestConnectionModalProps> = ({
  integration,
  result,
  isLoading,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Connection</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                Testing connection to <strong>{integration.name}</strong> ({integration.provider})
              </p>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Testing connection...</span>
              </div>
            )}

            {result && !isLoading && (
              <div className={`p-4 rounded-md ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {result.success ? (
                    <CheckIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`ml-2 text-sm font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sync Results Modal Component
interface SyncResultsModalProps {
  integration: IntegrationConfig;
  result: SyncResult | null;
  isLoading: boolean;
  onClose: () => void;
}

const SyncResultsModal: React.FC<SyncResultsModalProps> = ({
  integration,
  result,
  isLoading,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Results</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                Syncing leads with <strong>{integration.name}</strong> ({integration.provider})
              </p>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Syncing leads...</span>
              </div>
            )}

            {result && !isLoading && (
              <div className="space-y-3">
                <div className={`p-4 rounded-md ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? 'Sync Completed' : 'Sync Failed'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(result.duration / 1000)}s
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Processed:</span>
                    <span className="ml-2 font-medium">{result.recordsProcessed}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 font-medium text-green-600">{result.recordsCreated}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <span className="ml-2 font-medium text-blue-600">{result.recordsUpdated}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Failed:</span>
                    <span className="ml-2 font-medium text-red-600">{result.recordsFailed}</span>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                    <div className="space-y-1">
                      {result.errors.slice(0, 3).map((error, index) => (
                        <p key={index} className="text-xs text-red-700">{error}</p>
                      ))}
                      {result.errors.length > 3 && (
                        <p className="text-xs text-red-700">...and {result.errors.length - 3} more errors</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage; 