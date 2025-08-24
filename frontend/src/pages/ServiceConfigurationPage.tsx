import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ServiceProvider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  priority: number;
  capabilities: string;
  config: string;
  limits: string;
  scrapingConfig?: string | null;
}

interface OperationMapping {
  id: string;
  operation: string;
  serviceId: string;
  service: ServiceProvider;
  isEnabled: boolean;
  priority: number;
  config: string;
}

const ServiceConfigurationPage: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [mappings, setMappings] = useState<OperationMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'mappings' | 'usage'>('providers');
  
  // Edit state
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMapping, setEditingMapping] = useState<OperationMapping | null>(null);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    priority: 1,
    capabilities: '',
    config: '',
    limits: '',
    scrapingConfig: ''
  });
  const [mappingForm, setMappingForm] = useState({
    operation: '',
    serviceId: '',
    priority: 1,
    config: ''
  });

  useEffect(() => {
    loadData();
  }, []);



  const loadData = async () => {
    try {
      setLoading(true);
      const [providersRes, mappingsRes] = await Promise.all([
        api.get('/service-configuration/providers'),
        api.get('/service-configuration/mappings?operation=AI_DISCOVERY')
      ]);
      
      setProviders(providersRes.data);
      setMappings(mappingsRes.data);
    } catch (error) {
      console.error('Error loading service configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProviderStatus = async (providerId: string, isActive: boolean) => {
    try {
      await api.put(`/service-configuration/providers/${providerId}`, {
        isActive
      });
      await loadData();
    } catch (error) {
      console.error('Error updating provider status:', error);
    }
  };

  const toggleMappingStatus = async (mappingId: string, isEnabled: boolean) => {
    try {
      await api.put(`/service-configuration/mappings/${mappingId}`, {
        isEnabled
      });
      await loadData();
    } catch (error) {
      console.error('Error updating mapping status:', error);
    }
  };

  const startEditProvider = (provider: ServiceProvider) => {
    setEditingProvider(provider);
    setIsCreating(false);
    setEditForm({
      name: provider.name,
      type: provider.type,
      priority: provider.priority,
      capabilities: provider.capabilities,
      config: provider.config,
      limits: provider.limits,
      scrapingConfig: provider.scrapingConfig || ''
    });
  };

  const startCreateProvider = () => {
    setEditingProvider(null);
    setIsCreating(true);
    setEditForm({
      name: '',
      type: '',
      priority: 1,
      capabilities: '',
      config: '',
      limits: '',
      scrapingConfig: ''
    });
  };

  const cancelEdit = () => {
    setEditingProvider(null);
    setIsCreating(false);
    setEditForm({
      name: '',
      type: '',
      priority: 1,
      capabilities: '',
      config: '',
      limits: '',
      scrapingConfig: ''
    });
  };

  const saveProvider = async () => {
    try {
      if (isCreating) {
        // Create new provider
        await api.post('/service-configuration/providers', {
          name: editForm.name,
          type: editForm.type,
          priority: editForm.priority,
          capabilities: editForm.capabilities,
          config: editForm.config,
          limits: editForm.limits,
          scrapingConfig: editForm.scrapingConfig || null
        });
      } else if (editingProvider) {
        // Update existing provider
        await api.put(`/service-configuration/providers/${editingProvider.id}`, {
          name: editForm.name,
          type: editForm.type,
          priority: editForm.priority,
          capabilities: editForm.capabilities,
          config: editForm.config,
          limits: editForm.limits,
          scrapingConfig: editForm.scrapingConfig || null
        });
      }
      
      await loadData();
      cancelEdit();
    } catch (error) {
      console.error('Error saving provider:', error);
    }
  };

  const deleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this service provider? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log('Attempting to delete provider:', providerId);
      const response = await api.delete(`/service-configuration/providers/${providerId}`);
      console.log('Delete response:', response);
      await loadData();
      console.log('Provider deleted successfully');
    } catch (error) {
      console.error('Error deleting provider:', error);
      alert(`Failed to delete provider: ${error.response?.data?.error || error.message}`);
    }
  };

  const startEditMapping = (mapping: OperationMapping) => {
    setEditingMapping(mapping);
    setIsCreatingMapping(false);
    setMappingForm({
      operation: mapping.operation,
      serviceId: mapping.serviceId,
      priority: mapping.priority,
      config: mapping.config
    });
  };

  const startCreateMapping = () => {
    setEditingMapping(null);
    setIsCreatingMapping(true);
    setMappingForm({
      operation: '',
      serviceId: '',
      priority: 1,
      config: ''
    });
  };

  const cancelMappingEdit = () => {
    setEditingMapping(null);
    setIsCreatingMapping(false);
    setMappingForm({
      operation: '',
      serviceId: '',
      priority: 1,
      config: ''
    });
  };

  const saveMapping = async () => {
    try {
      if (isCreatingMapping) {
        // Create new mapping
        await api.post('/service-configuration/mappings', {
          operation: mappingForm.operation,
          serviceId: mappingForm.serviceId,
          priority: mappingForm.priority,
          config: mappingForm.config
        });
      } else if (editingMapping) {
        // Update existing mapping
        await api.put(`/service-configuration/mappings/${editingMapping.id}`, {
          operation: mappingForm.operation,
          serviceId: mappingForm.serviceId,
          priority: mappingForm.priority,
          config: mappingForm.config
        });
      }
      
      await loadData();
      cancelMappingEdit();
    } catch (error) {
      console.error('Error saving mapping:', error);
    }
  };

  const deleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this operation mapping? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/service-configuration/mappings/${mappingId}`);
      await loadData();
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const parseJson = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };



  // Render content based on state
  const renderContent = () => {
    // Check if user is super admin
    if (user?.role !== 'SUPER_ADMIN') {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Access Denied</h2>
            <p className="text-red-600">You need super admin privileges to access this page.</p>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Service Configuration</h1>
          <p className="text-gray-600 mt-2">
            Manage AI engines, scrapers, and service mappings for different operations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('providers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'providers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Service Providers
            </button>
            <button
              onClick={() => setActiveTab('mappings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mappings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Operation Mappings
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'usage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Usage Statistics
            </button>
          </nav>
        </div>

        {/* Service Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Service Providers</h2>
              <button 
                onClick={startCreateProvider}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Provider
              </button>
            </div>

            <div className="grid gap-6">
              {providers.map((provider) => (
                <div key={provider.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.type}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        provider.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => startEditProvider(provider)}
                        className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleProviderStatus(provider.id, !provider.isActive)}
                        className={`px-3 py-1 rounded text-sm ${
                          provider.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {provider.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deleteProvider(provider.id)}
                        className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <span className="text-sm text-gray-900">{provider.priority}</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capabilities</label>
                      <div className="text-sm text-gray-900">
                        {parseJson(provider.capabilities).map((cap: string, index: number) => (
                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Configuration</label>
                      <pre className="bg-gray-50 p-3 rounded text-xs text-gray-700 overflow-x-auto">
                        {formatJson(parseJson(provider.config))}
                      </pre>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limits</label>
                      <pre className="bg-gray-50 p-3 rounded text-xs text-gray-700 overflow-x-auto">
                        {formatJson(parseJson(provider.limits))}
                      </pre>
                    </div>
                    {provider.scrapingConfig && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scraping Config</label>
                        <pre className="bg-gray-50 p-3 rounded text-xs text-gray-700 overflow-x-auto">
                          {formatJson(parseJson(provider.scrapingConfig))}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Operation Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Operation Mappings</h2>
              <button 
                onClick={startCreateMapping}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Mapping
              </button>
            </div>

            <div className="grid gap-6">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mapping.operation} → {mapping.service.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Priority: {mapping.priority} | Service Type: {mapping.service.type}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mapping.isEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {mapping.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => startEditMapping(mapping)}
                        className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleMappingStatus(mapping.id, !mapping.isEnabled)}
                        className={`px-3 py-1 rounded text-sm ${
                          mapping.isEnabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {mapping.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => deleteMapping(mapping.id)}
                        className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Configuration</label>
                    <pre className="bg-gray-50 p-3 rounded text-xs text-gray-700 overflow-x-auto">
                      {formatJson(parseJson(mapping.config))}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Statistics Tab */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Usage Statistics</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-600">
                Usage statistics and cost tracking will be displayed here.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This feature is coming soon and will show detailed usage metrics, costs, and performance analytics.
              </p>
            </div>
          </div>
        )}

        {/* Provider Modal */}
        {(editingProvider || isCreating) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {isCreating ? 'Create New Service Provider' : `Edit Service Provider: ${editingProvider?.name}`}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="AI_ENGINE">AI Engine</option>
                      <option value="SCRAPER">Scraper</option>
                      <option value="SITE_ANALYZER">Site Analyzer</option>
                      <option value="KEYWORD_EXTRACTOR">Keyword Extractor</option>
                      <option value="CONTENT_ANALYZER">Content Analyzer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.priority}
                      onChange={(e) => setEditForm({...editForm, priority: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capabilities (JSON) *
                    </label>
                    <textarea
                      value={editForm.capabilities}
                      onChange={(e) => setEditForm({...editForm, capabilities: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validateJson(editForm.capabilities) ? 'border-gray-300' : 'border-red-500'
                      }`}
                      rows={3}
                      placeholder='["AI_DISCOVERY", "MARKET_DISCOVERY"]'
                      required
                    />
                    {!validateJson(editForm.capabilities) && (
                      <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Configuration (JSON) *
                    </label>
                    <textarea
                      value={editForm.config}
                      onChange={(e) => setEditForm({...editForm, config: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validateJson(editForm.config) ? 'border-gray-300' : 'border-red-500'
                      }`}
                      rows={4}
                      placeholder='{"apiKey": "your-api-key", "endpoint": "https://api.example.com"}'
                      required
                    />
                    {!validateJson(editForm.config) && (
                      <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limits (JSON) *
                    </label>
                    <textarea
                      value={editForm.limits}
                      onChange={(e) => setEditForm({...editForm, limits: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validateJson(editForm.limits) ? 'border-gray-300' : 'border-red-500'
                      }`}
                      rows={3}
                      placeholder='{"monthlyQuota": 1000, "concurrentRequests": 5}'
                      required
                    />
                    {!validateJson(editForm.limits) && (
                      <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scraping Config (JSON) - Optional
                    </label>
                    <textarea
                      value={editForm.scrapingConfig}
                      onChange={(e) => setEditForm({...editForm, scrapingConfig: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editForm.scrapingConfig === '' || validateJson(editForm.scrapingConfig) ? 'border-gray-300' : 'border-red-500'
                      }`}
                      rows={3}
                      placeholder='{"maxDepth": 3, "maxPages": 100, "delay": 1000}'
                    />
                    {editForm.scrapingConfig !== '' && !validateJson(editForm.scrapingConfig) && (
                      <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProvider}
                    disabled={!editForm.name || !editForm.type || !validateJson(editForm.capabilities) || !validateJson(editForm.config) || !validateJson(editForm.limits) || (editForm.scrapingConfig !== '' && !validateJson(editForm.scrapingConfig))}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mapping Modal */}
        {(editingMapping || isCreatingMapping) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {isCreatingMapping ? 'Create New Operation Mapping' : `Edit Operation Mapping: ${editingMapping?.operation} → ${editingMapping?.service.name}`}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operation *
                    </label>
                    <select
                      value={mappingForm.operation}
                      onChange={(e) => setMappingForm({...mappingForm, operation: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Operation</option>
                      <option value="AI_DISCOVERY">AI Discovery</option>
                      <option value="MARKET_DISCOVERY">Market Discovery</option>
                      <option value="WEB_SCRAPING">Web Scraping</option>
                      <option value="SITE_ANALYSIS">Site Analysis</option>
                      <option value="KEYWORD_EXTRACTION">Keyword Extraction</option>
                      <option value="CONTENT_ANALYSIS">Content Analysis</option>
                      <option value="LEAD_SCORING">Lead Scoring</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Provider *
                    </label>
                    <select
                      value={mappingForm.serviceId}
                      onChange={(e) => setMappingForm({...mappingForm, serviceId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Service Provider</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name} ({provider.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={mappingForm.priority}
                      onChange={(e) => setMappingForm({...mappingForm, priority: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Configuration (JSON) *
                    </label>
                    <textarea
                      value={mappingForm.config}
                      onChange={(e) => setMappingForm({...mappingForm, config: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validateJson(mappingForm.config) ? 'border-gray-300' : 'border-red-500'
                      }`}
                      rows={4}
                      placeholder='{"customConfig": "value", "timeout": 30000}'
                      required
                    />
                    {!validateJson(mappingForm.config) && (
                      <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={cancelMappingEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveMapping}
                    disabled={!mappingForm.operation || !mappingForm.serviceId || !validateJson(mappingForm.config)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Return content directly since ProtectedRoute already provides DashboardLayout
  return renderContent();
};

export default ServiceConfigurationPage;
