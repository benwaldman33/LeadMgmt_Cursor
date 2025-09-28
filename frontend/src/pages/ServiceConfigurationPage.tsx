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

// Type-specific templates and placeholders
const getTypeTemplates = (type: string) => {
  switch (type) {
    case 'AI_ENGINE':
      return {
        capabilities: '["AI_DISCOVERY", "AI_SCORING", "CONTENT_ANALYSIS"]',
        config: '{"apiKey": "your_openai_api_key_here", "model": "gpt-4", "endpoint": "https://api.openai.com/v1", "maxTokens": 4000, "temperature": 0.7}',
        limits: '{"monthlyQuota": 1000, "concurrentRequests": 5, "costPerRequest": 0.03, "rateLimit": "requests_per_minute"}',
        scrapingConfig: 'null'
      };
    case 'SCRAPER':
      return {
        capabilities: '["WEB_SCRAPING", "DATA_EXTRACTION"]',
        config: '{"apiToken": "your_apify_api_token_here", "baseUrl": "https://api.apify.com/v2", "defaultActorId": "your_actor_id_here", "userAgent": "Mozilla/5.0 (compatible; BBDS-Scraper/1.0)", "timeout": 30000}',
        limits: '{"monthlyQuota": 500, "concurrentRequests": 3, "costPerRequest": 0.01, "rateLimit": "requests_per_minute"}',
        scrapingConfig: '{"maxDepth": 3, "maxPages": 100, "requestDelay": 1000, "followRedirects": true, "respectRobotsTxt": true}'
      };
    case 'SITE_ANALYZER':
      return {
        capabilities: '["SITE_ANALYSIS", "TECHNOLOGY_DETECTION"]',
        config: '{"apiKey": "your_site_analyzer_api_key_here", "endpoint": "https://api.siteanalyzer.com/v1", "maxConcurrency": 5, "timeout": 60000}',
        limits: '{"monthlyQuota": 200, "concurrentRequests": 2, "costPerRequest": 0.05, "rateLimit": "requests_per_minute"}',
        scrapingConfig: '{"maxDepth": 2, "maxPages": 50, "requestDelay": 2000, "analyzeTechnologies": true, "analyzePerformance": true}'
      };
    case 'CONTENT_ANALYZER':
      return {
        capabilities: '["CONTENT_ANALYSIS", "SENTIMENT_ANALYSIS"]',
        config: '{"apiKey": "your_content_analyzer_api_key_here", "endpoint": "https://api.contentanalyzer.com/v1", "scoringModel": "standard", "confidenceThreshold": 0.8}',
        limits: '{"monthlyQuota": 1000, "concurrentRequests": 10, "costPerRequest": 0.02, "rateLimit": "requests_per_minute"}',
        scrapingConfig: 'null'
      };
    case 'KEYWORD_EXTRACTOR':
      return {
        capabilities: '["KEYWORD_EXTRACTION", "TOPIC_MODELING"]',
        config: '{"apiKey": "your_keyword_extractor_api_key_here", "endpoint": "https://api.keywordextractor.com/v1", "maxKeywords": 20, "language": "en"}',
        limits: '{"monthlyQuota": 500, "concurrentRequests": 5, "costPerRequest": 0.01, "rateLimit": "requests_per_minute"}',
        scrapingConfig: 'null'
      };
    default:
      return {
        capabilities: '["BASIC_OPERATIONS"]',
        config: '{}',
        limits: '{"monthlyQuota": 100, "concurrentRequests": 1, "costPerRequest": 0.01}',
        scrapingConfig: 'null'
      };
  }
};

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
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form');
  
  // Priority sync state
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
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
    loadSyncStatus();
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

  const loadSyncStatus = async () => {
    try {
      const response = await api.get('/service-configuration/priority-sync-status');
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const syncAllPriorities = async () => {
    if (!confirm('This will synchronize all OperationServiceMapping priorities to match their ServiceProvider priorities. Continue?')) {
      return;
    }

    try {
      setIsSyncing(true);
      setSyncMessage('Synchronizing priorities...');
      
      const response = await api.post('/service-configuration/sync-all-priorities');
      
      if (response.data.success) {
        setSyncMessage(response.data.message);
        await loadData(); // Reload data to show updated priorities
        await loadSyncStatus(); // Reload sync status
      } else {
        setSyncMessage(`Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error syncing priorities:', error);
      setSyncMessage('Error occurred during synchronization');
    } finally {
      setIsSyncing(false);
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
    setInputMode('json'); // Default to JSON view for editing
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
    setInputMode('form'); // Default to form view for creating
    setEditForm({
      name: '',
      type: '',
      priority: 1,
      capabilities: '[]',
      config: '{}',
      limits: '{}',
      scrapingConfig: ''
    });
  };

  const handleTypeChange = (newType: string) => {
    const templates = getTypeTemplates(newType);
    setEditForm({
      ...editForm,
      type: newType,
      capabilities: templates.capabilities,
      config: templates.config,
      limits: templates.limits,
      scrapingConfig: templates.scrapingConfig
    });
  };

  const cancelEdit = () => {
    setEditingProvider(null);
    setIsCreating(false);
    setInputMode('form');
    setEditForm({
      name: '',
      type: '',
      priority: 1,
      capabilities: '[]',
      config: '{}',
      limits: '{}',
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

  const testProvider = async (provider: ServiceProvider) => {
    try {
      console.log('Testing provider:', provider.name);
      const response = await api.post(`/service-configuration/providers/${provider.id}/test`);
      console.log('Test response:', response);
      
      if (response.data.success) {
        alert(`✅ ${provider.name} test successful!\n\nResponse: ${response.data.message || 'Service is working correctly'}`);
      } else {
        alert(`❌ ${provider.name} test failed!\n\nError: ${response.data.message || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        errorMessage = axiosError.response?.data?.error || axiosError.message || 'Unknown error occurred';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`❌ ${provider.name} test failed!\n\nError: ${errorMessage}`);
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

  // Structured form component for different service types
  const renderStructuredForm = () => {
    const templates = getTypeTemplates(editForm.type);
    
    // Available capabilities for selection
    const allCapabilities = [
      'AI_DISCOVERY',
      'MARKET_DISCOVERY', 
      'WEB_SCRAPING',
      'SITE_ANALYSIS',
      'KEYWORD_EXTRACTION',
      'CONTENT_ANALYSIS',
      'LEAD_SCORING'
    ];
    
    const currentCapabilities = parseJson(editForm.capabilities);
    
    const handleCapabilityToggle = (capability: string) => {
      let newCapabilities;
      if (currentCapabilities.includes(capability)) {
        newCapabilities = currentCapabilities.filter((cap: string) => cap !== capability);
      } else {
        newCapabilities = [...currentCapabilities, capability];
      }
      setEditForm({...editForm, capabilities: JSON.stringify(newCapabilities)});
    };
    
    return (
      <div className="space-y-4">
        {/* Capabilities Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capabilities *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {allCapabilities.map((capability) => (
              <label key={capability} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentCapabilities.includes(capability)}
                  onChange={() => handleCapabilityToggle(capability)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{capability}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Type-specific configuration fields */}
        {editForm.type === 'AI_ENGINE' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
              <input
                type="password"
                placeholder="Enter your API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.apiKey = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
              <input
                placeholder="e.g., gpt-4, claude-3-sonnet"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.model = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint *</label>
              <input
                placeholder="e.g., https://api.openai.com/v1, https://api.anthropic.com/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.endpoint = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                placeholder="4096"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.maxTokens = parseInt(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.temperature = parseFloat(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
          </div>
        )}
        
        {editForm.type === 'SCRAPER' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Token *</label>
              <input
                type="password"
                placeholder="Enter your Apify API token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.apiToken = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Actor *</label>
              <input
                placeholder="e.g., apify/web-scraper"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.defaultActor = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Concurrency</label>
              <input
                type="number"
                placeholder="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.maxConcurrency = parseInt(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
          </div>
        )}
        
        {editForm.type === 'SITE_ANALYZER' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
              <input
                type="password"
                placeholder="Enter your API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.apiKey = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint *</label>
              <input
                placeholder="e.g., https://api.siteanalyzer.com/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.endpoint = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Concurrency</label>
              <input
                type="number"
                placeholder="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.maxConcurrency = parseInt(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
              <input
                type="number"
                placeholder="30000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.timeout = parseInt(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
              <input
                placeholder="Custom-Analyzer/1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.userAgent = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
          </div>
        )}
        
        {editForm.type === 'CONTENT_ANALYZER' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
              <input
                type="password"
                placeholder="Enter your API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.apiKey = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint *</label>
              <input
                placeholder="e.g., https://api.contentanalyzer.com/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.endpoint = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scoring Model</label>
              <input
                placeholder="default"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.scoringModel = e.target.value;
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence Threshold</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="0.7"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.confidenceThreshold = parseFloat(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Analysis Time (ms)</label>
              <input
                type="number"
                placeholder="30000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const config = parseJson(editForm.config);
                  config.maxAnalysisTime = parseInt(e.target.value);
                  setEditForm({...editForm, config: JSON.stringify(config, null, 2)});
                }}
              />
            </div>
          </div>
        )}

        {/* Common Limits Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Service Limits</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Quota</label>
              <input
                type="number"
                placeholder="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const limits = parseJson(editForm.limits);
                  limits.monthlyQuota = parseInt(e.target.value);
                  setEditForm({...editForm, limits: JSON.stringify(limits, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concurrent Requests</label>
              <input
                type="number"
                placeholder="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const limits = parseJson(editForm.limits);
                  limits.concurrentRequests = parseInt(e.target.value);
                  setEditForm({...editForm, limits: JSON.stringify(limits, null, 2)});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Request</label>
              <input
                type="number"
                step="0.001"
                placeholder="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const limits = parseJson(editForm.limits);
                  limits.costPerRequest = parseFloat(e.target.value);
                  setEditForm({...editForm, limits: JSON.stringify(limits, null, 2)});
                }}
              />
            </div>
          </div>
        </div>

        {/* Scraping Configuration Section for applicable types */}
        {(editForm.type === 'SCRAPER' || editForm.type === 'SITE_ANALYZER') && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Scraping Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Depth</label>
                <input
                  type="number"
                  placeholder="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const scrapingConfig = parseJson(editForm.scrapingConfig);
                    scrapingConfig.maxDepth = parseInt(e.target.value);
                    setEditForm({...editForm, scrapingConfig: JSON.stringify(scrapingConfig, null, 2)});
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Pages</label>
                <input
                  type="number"
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const scrapingConfig = parseJson(editForm.scrapingConfig);
                    scrapingConfig.maxPages = parseInt(e.target.value);
                    setEditForm({...editForm, scrapingConfig: JSON.stringify(scrapingConfig, null, 2)});
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Delay (ms)</label>
                <input
                  type="number"
                  placeholder="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const scrapingConfig = parseJson(editForm.scrapingConfig);
                    scrapingConfig.requestDelay = parseInt(e.target.value);
                    setEditForm({...editForm, scrapingConfig: JSON.stringify(scrapingConfig, null, 2)});
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  onChange={(e) => {
                    const scrapingConfig = parseJson(editForm.scrapingConfig);
                    scrapingConfig.respectRobotsTxt = e.target.checked;
                    setEditForm({...editForm, scrapingConfig: JSON.stringify(scrapingConfig, null, 2)});
                  }}
                />
                <span className="text-sm text-gray-700">Respect robots.txt</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // JSON input component with templates
  const renderJsonInput = () => {
    const templates = getTypeTemplates(editForm.type);
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capabilities (JSON) *
          </label>
          <div className="flex space-x-2">
            <textarea
              value={editForm.capabilities}
              onChange={(e) => setEditForm({...editForm, capabilities: e.target.value})}
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validateJson(editForm.capabilities) ? 'border-gray-300' : 'border-red-500'
              }`}
              rows={3}
              placeholder={templates.capabilities}
              required
            />
            <button
              onClick={() => setEditForm({...editForm, capabilities: templates.capabilities})}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm whitespace-nowrap"
            >
              Use Template
            </button>
          </div>
          {!validateJson(editForm.capabilities) && (
            <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Configuration (JSON) *
          </label>
          <div className="flex space-x-2">
            <textarea
              value={editForm.config}
              onChange={(e) => setEditForm({...editForm, config: e.target.value})}
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validateJson(editForm.config) ? 'border-gray-300' : 'border-red-500'
              }`}
              rows={4}
              placeholder={templates.config}
              required
            />
            <button
              onClick={() => setEditForm({...editForm, config: templates.config})}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm whitespace-nowrap"
            >
              Use Template
            </button>
          </div>
          {!validateJson(editForm.config) && (
            <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limits (JSON) *
          </label>
          <div className="flex space-x-2">
            <textarea
              value={editForm.limits}
              onChange={(e) => setEditForm({...editForm, limits: e.target.value})}
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validateJson(editForm.limits) ? 'border-gray-300' : 'border-red-500'
              }`}
              rows={3}
              placeholder={templates.limits}
              required
            />
            <button
              onClick={() => setEditForm({...editForm, limits: templates.limits})}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm whitespace-nowrap"
            >
              Use Template
            </button>
          </div>
          {!validateJson(editForm.limits) && (
            <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scraping Config (JSON) - Optional
          </label>
          <div className="flex space-x-2">
            <textarea
              value={editForm.scrapingConfig}
              onChange={(e) => setEditForm({...editForm, scrapingConfig: e.target.value})}
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                editForm.scrapingConfig === '' || validateJson(editForm.scrapingConfig) ? 'border-gray-300' : 'border-red-500'
              }`}
              rows={3}
              placeholder={templates.scrapingConfig}
            />
            <button
              onClick={() => setEditForm({...editForm, scrapingConfig: templates.scrapingConfig})}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm whitespace-nowrap"
            >
              Use Template
            </button>
          </div>
          {editForm.scrapingConfig !== '' && !validateJson(editForm.scrapingConfig) && (
            <p className="text-red-500 text-sm mt-1">Invalid JSON format</p>
          )}
        </div>
      </div>
    );
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

        {/* Priority Sync Status */}
        {syncStatus && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Priority Synchronization Status</h3>
              <button
                onClick={syncAllPriorities}
                disabled={isSyncing}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isSyncing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSyncing ? 'Syncing...' : 'Sync All Priorities'}
              </button>
            </div>
            
            {syncMessage && (
              <div className={`p-3 rounded-lg mb-3 ${
                syncMessage.includes('Error') 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}>
                {syncMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Overall Sync</div>
                <div className="text-2xl font-bold text-blue-600">
                  {syncStatus.overallStatus?.overallSyncPercentage?.toFixed(1) || 0}%
                </div>
                <div className="text-xs text-gray-500">
                  {syncStatus.overallStatus?.syncedMappings || 0} / {syncStatus.overallStatus?.totalMappings || 0} mappings
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Providers</div>
                <div className="text-2xl font-bold text-green-600">
                  {syncStatus.overallStatus?.totalProviders || 0}
                </div>
                <div className="text-xs text-gray-500">Total service providers</div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-500">Unsynced</div>
                <div className="text-2xl font-bold text-red-600">
                  {syncStatus.overallStatus?.unsyncedMappings || 0}
                </div>
                <div className="text-xs text-gray-500">Mappings need sync</div>
              </div>
            </div>

            {syncStatus.providers && syncStatus.providers.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Provider Details:</h4>
                <div className="space-y-2">
                  {syncStatus.providers.map((provider: any) => (
                    <div key={provider.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{provider.name}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">Priority: {provider.priority}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          provider.syncPercentage === 100 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {provider.syncPercentage.toFixed(1)}% synced
                        </span>
                        {provider.unsyncedMappingsCount > 0 && (
                          <span className="text-red-600 text-xs">
                            {provider.unsyncedMappingsCount} unsynced
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
                      <button
                        onClick={() => testProvider(provider)}
                        className="px-3 py-1 rounded text-sm bg-purple-100 text-purple-700 hover:bg-purple-200"
                      >
                        Test
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
                      onChange={(e) => handleTypeChange(e.target.value)}
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

                  {/* Input Mode Toggle */}
                  {editForm.type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Input Mode</label>
                      <div className="flex space-x-4">
                        <button
                          onClick={() => setInputMode('form')}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            inputMode === 'form' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Form View
                        </button>
                        <button
                          onClick={() => setInputMode('json')}
                          className={`px-4 py-2 rounded-md text-sm font-medium ${
                            inputMode === 'json' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          JSON View
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Form Content */}
                  {editForm.type && (
                    inputMode === 'form' ? renderStructuredForm() : renderJsonInput()
                  )}
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
