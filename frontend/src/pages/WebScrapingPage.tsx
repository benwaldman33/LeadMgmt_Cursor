import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { webScrapingService } from '../services/webScrapingService';
import type { ScrapingResult, ScrapingJob } from '../services/webScrapingService';
import { useNotifications } from '../contexts/NotificationContext';
import {
  GlobeAltIcon,
  DocumentTextIcon,
  CogIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const WebScrapingPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [urls, setUrls] = useState<string>('');
  const [industry, setIndustry] = useState<string>('dental');
  const [selectedResult, setSelectedResult] = useState<ScrapingResult | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['scraping-stats'],
    queryFn: webScrapingService.getScrapingStats
  });

  const { data: healthStatus, isLoading: healthLoading } = useQuery({
    queryKey: ['scraping-health'],
    queryFn: webScrapingService.healthCheck
  });

  // Mutations
  const scrapeUrlMutation = useMutation({
    mutationFn: ({ url, industry }: { url: string; industry?: string }) =>
      webScrapingService.scrapeUrl(url, industry),
    onSuccess: (result) => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Successfully scraped ${result.url}`
      });
      setSelectedResult(result);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scrape URL';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    },
  });

  const scrapeBatchMutation = useMutation({
    mutationFn: ({ urls, industry }: { urls: string[]; industry?: string }) =>
      webScrapingService.scrapeBatch(urls, industry),
    onSuccess: (job) => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Batch scraping completed. Processed ${job.results.length} URLs`
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process batch scraping';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    },
  });

  const checkAccessibilityMutation = useMutation({
    mutationFn: ({ url }: { url: string }) => webScrapingService.checkUrlAccessibility(url),
    onSuccess: (result) => {
      addNotification({
        type: result.isAccessible ? 'success' : 'warning',
        title: 'Accessibility Check',
        message: `${result.url} is ${result.isAccessible ? 'accessible' : 'not accessible'}`
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check accessibility';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    },
  });

  const handleScrapeUrl = () => {
    const url = urls.trim();
    if (!url) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a URL to scrape'
      });
      return;
    }

    if (!webScrapingService.validateUrl(url)) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid URL'
      });
      return;
    }

    scrapeUrlMutation.mutate({ url, industry });
  };

  const handleBatchScrape = () => {
    const urlList = urls.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    
    if (urlList.length === 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter at least one URL to scrape'
      });
      return;
    }

    if (urlList.length > 100) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Maximum 100 URLs allowed per batch'
      });
      return;
    }

    // Validate all URLs
    const invalidUrls = urlList.filter(url => !webScrapingService.validateUrl(url));
    if (invalidUrls.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: `Invalid URLs found: ${invalidUrls.join(', ')}`
      });
      return;
    }

    scrapeBatchMutation.mutate({ urls: urlList, industry });
  };

  const handleCheckAccessibility = () => {
    const url = urls.trim();
    if (!url) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a URL to check'
      });
      return;
    }

    checkAccessibilityMutation.mutate({ url });
  };

  const industries = [
    { value: 'dental', label: 'Dental Equipment' },
    { value: 'construction', label: 'Construction Equipment' },
    { value: 'manufacturing', label: 'Food & Beverage Manufacturing' },
    { value: 'warehouse', label: 'Distribution & Warehouse' },
    { value: 'retail', label: 'Retail Technology' },
    { value: 'general', label: 'General' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Web Scraping</h1>
          <p className="text-gray-600">Extract content from websites for lead analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          {healthStatus && (
            <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
              healthStatus.testResult 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {healthStatus.testResult ? (
                <CheckCircleIcon className="h-4 w-4 mr-1" />
              ) : (
                <XCircleIcon className="h-4 w-4 mr-1" />
              )}
              {healthStatus.testResult ? 'Healthy' : 'Unhealthy'}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <GlobeAltIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total URLs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUrls}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Successful</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successfulScrapes}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failedScrapes}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {webScrapingService.formatProcessingTime(stats.averageProcessingTime)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scraping Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {industries.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URLs
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder="Enter URLs (one per line for batch processing)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter a single URL for individual scraping or multiple URLs (one per line) for batch processing
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleScrapeUrl}
                  disabled={scrapeUrlMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {scrapeUrlMutation.isPending ? (
                    <>
                      <CogIcon className="h-4 w-4 mr-2 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Scrape URL
                    </>
                  )}
                </button>

                <button
                  onClick={handleBatchScrape}
                  disabled={scrapeBatchMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {scrapeBatchMutation.isPending ? (
                    <>
                      <CogIcon className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      Batch Scrape
                    </>
                  )}
                </button>

                <button
                  onClick={handleCheckAccessibility}
                  disabled={checkAccessibilityMutation.isPending}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {checkAccessibilityMutation.isPending ? (
                    <CogIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <GlobeAltIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Industry Technologies */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Technologies</h3>
            <div className="space-y-2">
              {webScrapingService.getIndustryTechnologies(industry).map((tech) => (
                <div key={tech} className="flex items-center text-sm">
                  <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mr-2" />
                  {tech}
                </div>
              ))}
            </div>
          </div>

          {/* Industry Certifications */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Certifications</h3>
            <div className="space-y-2">
              {webScrapingService.getIndustryCertifications(industry).map((cert) => (
                <div key={cert} className="flex items-center text-sm">
                  <ShieldCheckIcon className="h-4 w-4 text-gray-400 mr-2" />
                  {cert}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {selectedResult && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scraping Results</h3>
              
              <div className="space-y-4">
                {/* URL and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{selectedResult.url}</span>
                  </div>
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                    selectedResult.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedResult.success ? (
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 mr-1" />
                    )}
                    {selectedResult.success ? 'Success' : 'Failed'}
                  </div>
                </div>

                {selectedResult.success ? (
                  <>
                    {/* Metadata */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Metadata</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Title:</span> {selectedResult.metadata.title}
                        </div>
                        <div>
                          <span className="font-medium">Description:</span> {selectedResult.metadata.description}
                        </div>
                        <div>
                          <span className="font-medium">Language:</span> {selectedResult.metadata.language}
                        </div>
                        {selectedResult.metadata.keywords.length > 0 && (
                          <div>
                            <span className="font-medium">Keywords:</span> {selectedResult.metadata.keywords.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Structured Data */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Extracted Data</h4>
                      <div className="space-y-3">
                        {selectedResult.structuredData.companyName && (
                          <div className="flex items-center text-sm">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">Company:</span> {selectedResult.structuredData.companyName}
                          </div>
                        )}

                        {selectedResult.structuredData.contactInfo?.email && (
                          <div className="flex items-center text-sm">
                            <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">Email:</span> {selectedResult.structuredData.contactInfo.email}
                          </div>
                        )}

                        {selectedResult.structuredData.contactInfo?.phone && (
                          <div className="flex items-center text-sm">
                            <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">Phone:</span> {selectedResult.structuredData.contactInfo.phone}
                          </div>
                        )}

                        {selectedResult.structuredData.technologies && selectedResult.structuredData.technologies.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="font-medium">Technologies:</span>
                            </div>
                            <div className="ml-6 flex flex-wrap gap-1">
                              {selectedResult.structuredData.technologies.map((tech) => (
                                <span key={tech} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedResult.structuredData.certifications && selectedResult.structuredData.certifications.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <ShieldCheckIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="font-medium">Certifications:</span>
                            </div>
                            <div className="ml-6 flex flex-wrap gap-1">
                              {selectedResult.structuredData.certifications.map((cert) => (
                                <span key={cert} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                  {cert}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Content Preview</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {selectedResult.content.substring(0, 500)}
                        {selectedResult.content.length > 500 && '...'}
                      </div>
                    </div>

                    {/* Processing Info */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Processing Time: {webScrapingService.formatProcessingTime(selectedResult.processingTime)}</span>
                        <span>{new Date(selectedResult.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border-t pt-4">
                    <div className="text-red-600 text-sm">
                      <strong>Error:</strong> {selectedResult.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!selectedResult && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">How to Use</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    1
                  </div>
                  <p>Select the target industry for specialized content extraction</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    2
                  </div>
                  <p>Enter a single URL for individual scraping or multiple URLs for batch processing</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    3
                  </div>
                  <p>Click "Scrape URL" for individual processing or "Batch Scrape" for multiple URLs</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    4
                  </div>
                  <p>Review the extracted content, metadata, and structured data in the results panel</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebScrapingPage; 