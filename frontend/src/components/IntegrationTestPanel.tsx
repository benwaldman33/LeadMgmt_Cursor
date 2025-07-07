import React, { useState } from 'react';
import { integrationService } from '../services/integrationService';
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

interface IntegrationTestPanelProps {
  integrationId: string;
}

const IntegrationTestPanel: React.FC<IntegrationTestPanelProps> = ({ integrationId }) => {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState<Record<string, any>>({});

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Validate configuration
      const validation = integrationService.validateConfig(integrationId, config);
      if (!validation.isValid) {
        setTestResult({
          success: false,
          message: validation.message || 'Configuration validation failed',
          details: validation.details
        });
        return;
      }

      // Run connection test
      const connectionTest = await integrationService.testConnection(integrationId, config);
      if (!connectionTest.success) {
        setTestResult(prev => prev ? { ...prev, success: false, message: connectionTest.message } : null);
        return;
      }

      // Run authentication test
      const authTest = await integrationService.testAuthentication(integrationId, config);
      if (!authTest.success) {
        setTestResult(prev => prev ? { ...prev, success: false, message: authTest.message } : null);
        return;
      }

      // Run data retrieval test
      const dataTest = await integrationService.testDataRetrieval(integrationId, config);
      if (!dataTest.success) {
        setTestResult(prev => prev ? { ...prev, success: false, message: dataTest.message } : null);
        return;
      }

      setTestResult({
        success: true,
        message: 'All tests passed successfully',
        details: {
          connection: connectionTest,
          authentication: authTest,
          dataRetrieval: dataTest,
          duration: Date.now() - Date.now()
        }
      });

    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Integration Test</h3>
          <p className="text-sm text-gray-500">Test the integration configuration</p>
        </div>
        <button
          onClick={runTest}
          disabled={isTesting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4 mr-2" />
              Run Test
            </>
          )}
        </button>
      </div>

      {/* Configuration Form */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              type="url"
              value={config.baseUrl || ''}
              onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://api.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={config.username || ''}
              onChange={(e) => handleConfigChange('username', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={config.password || ''}
              onChange={(e) => handleConfigChange('password', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter password"
            />
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            {testResult.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <h4 className="text-sm font-medium text-gray-900">
              {testResult.success ? 'Test Passed' : 'Test Failed'}
            </h4>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">{testResult.message}</p>

          {testResult.details && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900 mb-2">
                View Details
              </summary>
              <div className="bg-gray-50 p-3 rounded">
                {testResult.details.steps && Array.isArray(testResult.details.steps) && (
                  <div className="space-y-2">
                    {testResult.details.steps.map((step: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        {step.success ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">{step.name}</span>
                        {step.message && (
                          <span className="text-xs text-gray-500">- {step.message}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {testResult.details.duration && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span>Duration: {testResult.details.duration}ms</span>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Previous Results */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Previous Results</h4>
        <div className="space-y-2">
          {/* This would be populated with actual test history */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm">Connection test passed</span>
            </div>
            <span className="text-xs text-gray-500">2 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTestPanel; 