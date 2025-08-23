import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
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

  // Check if user is super admin
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Access Denied</h2>
            <p className="text-red-600">You need super admin privileges to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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

  if (loading) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
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
                        onClick={() => toggleProviderStatus(provider.id, !provider.isActive)}
                        className={`px-3 py-1 rounded text-sm ${
                          provider.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {provider.isActive ? 'Disable' : 'Enable'}
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
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
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
                        onClick={() => toggleMappingStatus(mapping.id, !mapping.isEnabled)}
                        className={`px-3 py-1 rounded text-sm ${
                          mapping.isEnabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {mapping.isEnabled ? 'Disable' : 'Enable'}
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
      </div>
    </DashboardLayout>
  );
};

export default ServiceConfigurationPage;
