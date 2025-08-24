import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apifyService } from '../services/apifyService';
import type { ApifyActorConfig, ApifyScrapingJob, ApifyScrapingResult, ApifyServiceConfig } from '../services/apifyService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  GlobeAltIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  CogIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const ApifyPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  
  // State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedActor, setSelectedActor] = useState<ApifyActorConfig | null>(null);
  const [urls, setUrls] = useState<string>('');
  const [industry, setIndustry] = useState<string>('general');
  const [selectedJob, setSelectedJob] = useState<ApifyScrapingJob | null>(null);
  const [showMigrationInfo, setShowMigrationInfo] = useState(false);

  // Form state for creating new actor
  const [newActor, setNewActor] = useState({
    name: '',
    description: '',
    actorId: '',
    apiToken: '',
    isActive: true,
    defaultInput: {}
  });

  // Queries
  const { data: actors, isLoading: actorsLoading } = useQuery({
    queryKey: ['apify-actors'],
    queryFn: apifyService.getActorConfigs
  });

  // New query for ServiceProvider-based services
  const { data: apifyServices, isLoading: servicesLoading } = useQuery({
    queryKey: ['apify-services'],
    queryFn: apifyService.getApifyServices,
    enabled: true // Now enabled since we have the backend endpoint
  });

  // Mutations
  const createActorMutation = useMutation({
    mutationFn: apifyService.createActorConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apify-actors'] });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Apify Actor configuration created successfully'
      });
      setShowCreateForm(false);
      setNewActor({
        name: '',
        description: '',
        actorId: '',
        apiToken: '',
        isActive: true,
        defaultInput: {}
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create actor configuration';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  });

  const testActorMutation = useMutation({
    mutationFn: ({ actorId, apiToken }: { actorId: string; apiToken: string }) =>
      apifyService.testActorConfig(actorId, apiToken),
    onSuccess: (isValid) => {
      addNotification({
        type: isValid ? 'success' : 'error',
        title: isValid ? 'Success' : 'Error',
        message: isValid ? 'Actor configuration is valid' : 'Actor configuration is invalid'
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test actor configuration';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  });

  const scrapeMutation = useMutation({
    mutationFn: ({ actorId, urls, industry }: { actorId: string; urls: string[]; industry?: string }) =>
      apifyService.scrapeWithActor(actorId, urls, industry),
    onSuccess: (job) => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Scraping job started with ID: ${job.id}`
      });
      setSelectedJob(job);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start scraping job';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    }
  });

  const handleCreateActor = () => {
    if (!newActor.name || !newActor.actorId || !newActor.apiToken) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Name, Actor ID, and API Token are required'
      });
      return;
    }

    createActorMutation.mutate(newActor);
  };

  const handleTestActor = (actor: ApifyActorConfig) => {
    testActorMutation.mutate({
      actorId: actor.actorId,
      apiToken: actor.apiToken
    });
  };

  const handleScrape = () => {
    if (!selectedActor) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please select an Apify Actor'
      });
      return;
    }

    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    if (urlList.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please enter at least one URL'
      });
      return;
    }

    scrapeMutation.mutate({
      actorId: selectedActor.id,
      urls: urlList,
      industry
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'running':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Apify Integration</h1>
        <p className="text-gray-600">Manage your Apify Actors and run web scraping jobs</p>
        
        {/* Migration Information */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">System Integration Update</h3>
              <p className="text-sm text-blue-700 mt-1">
                Apify services can now be configured through the Service Configuration panel for centralized management. 
                Legacy Apify Actor configurations are still supported for backward compatibility.
              </p>
              <button
                onClick={() => setShowMigrationInfo(!showMigrationInfo)}
                className="text-sm text-blue-600 hover:text-blue-800 underline mt-2"
              >
                {showMigrationInfo ? 'Hide details' : 'Learn more'}
              </button>
            </div>
          </div>
          
          {showMigrationInfo && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Service Configuration (Recommended)</h4>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Centralized service management</li>
                    <li>• Rate limiting and quotas</li>
                    <li>• Service priorities and fallbacks</li>
                    <li>• Unified monitoring</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Legacy Apify Actors</h4>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Individual actor configurations</li>
                    <li>• Separate API token management</li>
                    <li>• Limited service orchestration</li>
                    <li>• Will be deprecated in future versions</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                <p className="text-sm text-blue-800">
                  <strong>Recommendation:</strong> Configure new Apify services through Service Configuration → 
                  <a href="/service-configuration" className="text-blue-600 hover:text-blue-800 underline ml-1">
                    Go to Service Configuration
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Actor Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create New Apify Actor</h2>
            <div className="flex items-center text-amber-600 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              Legacy System
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            This creates a legacy Apify Actor configuration. Consider using Service Configuration instead for better integration.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newActor.name}
                onChange={(e) => setNewActor({ ...newActor, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Web Scraper"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actor ID</label>
              <input
                type="text"
                value={newActor.actorId}
                onChange={(e) => setNewActor({ ...newActor, actorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="abc123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
              <input
                type="password"
                value={newActor.apiToken}
                onChange={(e) => setNewActor({ ...newActor, apiToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="apify_api_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newActor.description}
                onChange={(e) => setNewActor({ ...newActor, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Web scraper for dental websites"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateActor}
              disabled={createActorMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createActorMutation.isPending ? 'Creating...' : 'Create Actor'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ServiceProvider-based Apify Services */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Service Configuration Apify Services</h2>
              <a
                href="/service-configuration"
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Configure Services
              </a>
            </div>
          </div>
          <div className="p-6">
            {servicesLoading ? (
              <div className="text-center py-4">Loading services...</div>
            ) : apifyServices && apifyServices.length > 0 ? (
              <div className="space-y-4">
                {apifyServices.map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedActor?.id === service.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedActor({
                      id: service.id,
                      name: service.name,
                      description: `Service Provider: ${service.name}`,
                      actorId: service.config.defaultActorId || 'default',
                      apiToken: service.config.apiToken,
                      isActive: service.isActive,
                      defaultInput: service.scrapingConfig || {},
                      createdAt: new Date(),
                      updatedAt: new Date()
                    })}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{service.name}</h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Service Provider
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Priority: {service.priority}</p>
                        <p className="text-xs text-gray-500">Capabilities: {service.capabilities.join(', ')}</p>
                        {service.limits.monthlyQuota && (
                          <p className="text-xs text-gray-500">Monthly Quota: {service.limits.monthlyQuota}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestActor({
                              id: service.id,
                              name: service.name,
                              description: `Service Provider: ${service.name}`,
                              actorId: service.config.defaultActorId || 'default',
                              apiToken: service.config.apiToken,
                              isActive: service.isActive,
                              defaultInput: service.scrapingConfig || {},
                              createdAt: new Date(),
                              updatedAt: new Date()
                            });
                          }}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Test Service"
                        >
                          <CogIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CogIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No Apify services configured</p>
                <p className="text-sm">Configure services in Service Configuration panel</p>
                <a
                  href="/service-configuration"
                  className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Go to Service Configuration
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Legacy Apify Actors */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Legacy Apify Actors</h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-2 inline" />
                Add Legacy Actor
              </button>
            </div>
            <div className="mt-2 text-sm text-amber-600">
              <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
              Legacy system - consider migrating to Service Configuration
            </div>
          </div>
          <div className="p-6">
            {actorsLoading ? (
              <div className="text-center py-4">Loading actors...</div>
            ) : actors && actors.length > 0 ? (
              <div className="space-y-4">
                {actors.map((actor) => (
                  <div
                    key={actor.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedActor?.id === actor.id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedActor(actor)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{actor.name}</h3>
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                            Legacy
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{actor.description}</p>
                        <p className="text-xs text-gray-500">ID: {actor.actorId}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestActor(actor);
                          }}
                          className="p-1 text-gray-400 hover:text-amber-600"
                          title="Test Actor"
                        >
                          <CogIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <GlobeAltIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No legacy Apify Actors configured</p>
                <p className="text-sm">Click "Add Legacy Actor" to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scraping Interface */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Web Scraping</h2>
        </div>
        <div className="p-6">
          {selectedActor ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Actor: {selectedActor.name}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com&#10;https://example2.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="dental">Dental</option>
                  <option value="construction">Construction</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="food-beverage">Food & Beverage</option>
                  <option value="distribution">Distribution</option>
                </select>
              </div>
              <button
                onClick={handleScrape}
                disabled={scrapeMutation.isPending || !urls.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {scrapeMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Starting Scrape...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Scraping
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CogIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select an Apify Actor to start scraping</p>
            </div>
          )}
        </div>
      </div>

      {/* Job Results */}
      {selectedJob && (
        <div className="mt-8 bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Scraping Job Results</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(selectedJob.status)}
                <span className="font-medium">Job ID: {selectedJob.id}</span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(selectedJob.createdAt).toLocaleString()}
              </span>
            </div>
            
            {selectedJob.error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">Error: {selectedJob.error}</p>
              </div>
            )}

            {selectedJob.results && selectedJob.results.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Results ({selectedJob.results.length})</h3>
                {selectedJob.results.map((result, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-blue-600">{result.url}</h4>
                      {result.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    {result.success && (
                      <div className="text-sm text-gray-600">
                        <p><strong>Title:</strong> {result.metadata.title}</p>
                        <p><strong>Company:</strong> {result.structuredData.companyName || 'N/A'}</p>
                        <p><strong>Processing Time:</strong> {result.processingTime}ms</p>
                      </div>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600">Error: {result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApifyPage;
