import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { webSocketService } from '../services/websocketService';

interface DiscoveryProgress {
  phase: string;
  status: string;
  progress: number;
  prospectsFound: number;
  prospectsAnalyzed: number;
  leadsQualified: number;
  leadsCreated: number;
  estimatedCompletion?: Date;
  currentActivity?: string;
  errors?: string[];
}

interface DiscoveryExecution {
  id: string;
  name: string;
  status: string;
  phase: string;
  prospectsFound: number;
  prospectsAnalyzed: number;
  leadsQualified: number;
  leadsCreated: number;
  startedAt: string;
  completedAt?: string;
  discoveryModel: {
    name: string;
    industry: string;
    subIndustry: string;
    product: string;
  };
}

const DiscoveryProgressPage: React.FC = () => {
  const { executionId } = useParams<{ executionId: string }>();
  const navigate = useNavigate();
  
  const [execution, setExecution] = useState<DiscoveryExecution | null>(null);
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (!executionId) {
      setError('No execution ID provided');
      setIsLoading(false);
      return;
    }

    loadExecutionProgress();
    setupWebSocketConnection();

    return () => {
      // Clean up WebSocket connection
      webSocketService.off(`discovery_progress_${executionId}`);
    };
  }, [executionId]);

  const loadExecutionProgress = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/market-analysis/execution/${executionId}/progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load execution progress');
      }

      const data = await response.json();
      setProgress(data.data.progress);
      
      // For demo purposes, create a mock execution object
      setExecution({
        id: executionId!,
        name: 'Commercial Plumbing - Water Jetting Equipment Discovery',
        status: data.data.progress.status,
        phase: data.data.progress.phase,
        prospectsFound: data.data.progress.prospectsFound,
        prospectsAnalyzed: data.data.progress.prospectsAnalyzed,
        leadsQualified: data.data.progress.leadsQualified,
        leadsCreated: data.data.progress.leadsCreated,
        startedAt: new Date().toISOString(),
        discoveryModel: {
          name: 'Commercial Plumbing - Water Jetting Equipment',
          industry: 'Plumbing, Heating, and Air-Conditioning Contractors',
          subIndustry: 'Commercial Plumbing',
          product: 'High-pressure water jetting systems'
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebSocketConnection = () => {
    try {
      webSocketService.on(`discovery_progress_${executionId}`, (data: any) => {
        console.log('WebSocket progress update:', data);
        setProgress(prevProgress => ({
          ...prevProgress,
          ...data,
          timestamp: new Date(data.timestamp)
        }));
        setWsConnected(true);
      });

      // Test WebSocket connection
      setTimeout(() => {
        if (!wsConnected) {
          console.log('WebSocket not connected, using polling fallback');
          startProgressPolling();
        }
      }, 3000);

    } catch (err) {
      console.error('WebSocket setup failed:', err);
      startProgressPolling();
    }
  };

  const startProgressPolling = () => {
    const interval = setInterval(async () => {
      if (progress?.status === 'completed' || progress?.status === 'failed') {
        clearInterval(interval);
        return;
      }
      
      try {
        await loadExecutionProgress();
      } catch (err) {
        console.error('Progress polling error:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  };

  const getPhaseDisplayName = (phase: string): string => {
    const phaseNames: { [key: string]: string } = {
      'initialization': 'Initializing',
      'market_research': 'Market Research',
      'web_scraping': 'Web Scraping',
      'content_analysis': 'AI Content Analysis',
      'lead_qualification': 'Lead Qualification',
      'completed': 'Completed'
    };
    return phaseNames[phase] || phase;
  };

  const getPhaseIcon = (phase: string): string => {
    const phaseIcons: { [key: string]: string } = {
      'initialization': '🚀',
      'market_research': '🔍',
      'web_scraping': '🕷️',
      'content_analysis': '🧠',
      'lead_qualification': '✅',
      'completed': '🎉'
    };
    return phaseIcons[phase] || '⚙️';
  };

  const getStatusColor = (status: string): string => {
    const statusColors: { [key: string]: string } = {
      'planning': 'text-blue-600 bg-blue-100',
      'running': 'text-green-600 bg-green-100',
      'completed': 'text-emerald-600 bg-emerald-100',
      'failed': 'text-red-600 bg-red-100',
      'paused': 'text-yellow-600 bg-yellow-100'
    };
    return statusColors[status] || 'text-gray-600 bg-gray-100';
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const calculateEstimatedTotal = (): number => {
    if (!progress || !execution) return 0;
    
    // Mock calculation based on target prospect count
    const baseTime = 4; // 4 hours base time
    const targetCount = 5000; // Default target
    return baseTime * (targetCount / 5000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Discovery Progress...</h3>
            <p className="text-gray-600">Please wait while we fetch the latest information.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Progress</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/market-discovery')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Discovery
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!execution || !progress) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Discovery Execution Not Found</h3>
            <p className="text-gray-600 mb-4">The discovery execution you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/market-discovery')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Discovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{execution.discoveryModel.name}</h1>
              <p className="text-gray-600 mt-1">
                {execution.discoveryModel.industry} → {execution.discoveryModel.subIndustry}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(execution.status)}`}>
                {execution.status.toUpperCase()}
              </span>
              {wsConnected && (
                <div className="flex items-center text-green-600 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Updates
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Phase & Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Progress</h2>
            <div className="text-sm text-gray-500">
              Duration: {formatDuration(execution.startedAt, execution.completedAt)}
            </div>
          </div>

          {/* Phase Indicator */}
          <div className="flex items-center mb-6">
            <div className="text-4xl mr-4">{getPhaseIcon(progress.phase)}</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{getPhaseDisplayName(progress.phase)}</h3>
              <p className="text-gray-600">{progress.currentActivity || 'Processing...'}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{progress.progress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
          </div>

          {/* Phase Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['initialization', 'market_research', 'web_scraping', 'content_analysis', 'lead_qualification'].map((phase, index) => {
              const isActive = progress.phase === phase;
              const isCompleted = ['initialization', 'market_research', 'web_scraping', 'content_analysis'].indexOf(progress.phase) > index;
              
              return (
                <div key={phase} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isActive ? 'bg-blue-500 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : getPhaseIcon(phase)}
                  </div>
                  <div className="text-xs text-center mt-2 font-medium">
                    {getPhaseDisplayName(phase)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{progress.prospectsFound.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Prospects Found</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🧠</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{progress.prospectsAnalyzed.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Analyzed by AI</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{progress.leadsQualified.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Qualified</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{progress.leadsCreated.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Leads Created</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Log */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Activity Feed</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {progress.currentActivity && (
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm text-gray-900">{progress.currentActivity}</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
              )}
              
              {/* Mock activity entries */}
              {progress.prospectsFound > 0 && (
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm text-gray-900">Found {progress.prospectsFound.toLocaleString()} prospects from business directories</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-900">Discovery execution started</p>
                  <p className="text-xs text-gray-500">{formatDuration(execution.startedAt)} ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Execution Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Target Product:</span>
                <p className="text-gray-600">{execution.discoveryModel.product}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Market Segment:</span>
                <p className="text-gray-600">{execution.discoveryModel.subIndustry}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Target Count:</span>
                <p className="text-gray-600">5,000 prospects</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Estimated Total Time:</span>
                <p className="text-gray-600">{calculateEstimatedTotal().toFixed(1)} hours</p>
              </div>
              
              {progress.estimatedCompletion && (
                <div>
                  <span className="font-medium text-gray-700">ETA:</span>
                  <p className="text-gray-600">
                    {new Date(progress.estimatedCompletion).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {progress.status === 'completed' && (
                <button
                  onClick={() => navigate('/leads')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Generated Leads
                </button>
              )}
              
              <button
                onClick={() => navigate('/market-discovery')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Start New Discovery
              </button>
            </div>
          </div>
        </div>

        {/* Completion Message */}
        {progress.status === 'completed' && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-4xl mr-4">🎉</div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Discovery Completed Successfully!</h3>
                <p className="text-green-700 mt-1">
                  Found {progress.prospectsFound.toLocaleString()} prospects, analyzed {progress.prospectsAnalyzed.toLocaleString()}, 
                  and created {progress.leadsCreated.toLocaleString()} qualified leads.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {progress.errors && progress.errors.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Execution Errors</h3>
            <ul className="space-y-1">
              {progress.errors.map((error, index) => (
                <li key={index} className="text-red-700 text-sm">• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryProgressPage;
