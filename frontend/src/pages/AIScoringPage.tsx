import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AIScoringService } from '../services/aiScoringService';
import { useNotifications } from '../contexts/NotificationContext';
import ClaudeConfigPanel from '../components/ClaudeConfigPanel';
import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  ClockIcon,
  ChartBarSquareIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const AIScoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'predictions' | 'analysis' | 'claude' | 'config'>('overview');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [analysisText, setAnalysisText] = useState<string>('');
  const [newModel, setNewModel] = useState({
    name: '',
    type: 'regression' as const,
    features: [] as string[]
  });
  const [trainingDataSize, setTrainingDataSize] = useState<number>(100);

  // Claude AI state
  const [claudeLeadData, setClaudeLeadData] = useState({
    companyName: '',
    industry: 'dental',
    domain: '',
    content: '',
    technologies: [] as string[],
    certifications: [] as string[]
  });
  const [selectedIndustry, setSelectedIndustry] = useState('dental');
  const [claudeAnalysisContent, setClaudeAnalysisContent] = useState('');
  const [currentWeights, setCurrentWeights] = useState<Record<string, number>>({
    companySize: 20,
    industryScore: 25,
    technologyCount: 15,
    domainAge: 10,
    socialPresence: 10,
    fundingStage: 20
  });
  const [performanceData, setPerformanceData] = useState({
    accuracy: 0.85,
    precision: 0.82,
    recall: 0.78,
    conversionRate: 0.15
  });

  const { addNotification } = useNotifications();
  const aiScoringService = new AIScoringService();

  // Queries
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => aiScoringService.getInsights()
  });

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => aiScoringService.getActiveModels()
  });

  const { data: prediction, isLoading: predictionLoading } = useQuery({
    queryKey: ['ai-prediction', selectedLeadId],
    queryFn: () => aiScoringService.predictScore(selectedLeadId),
    enabled: !!selectedLeadId
  });

  const { data: textAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['text-analysis', analysisText],
    queryFn: () => aiScoringService.analyzeText(analysisText),
    enabled: !!analysisText && analysisText.length > 10
  });

  // Claude AI Queries
  const { data: claudePrediction, isLoading: claudePredictionLoading, refetch: refetchClaudePrediction } = useQuery({
    queryKey: ['claude-prediction', claudeLeadData],
    queryFn: () => aiScoringService.scoreLeadWithClaude(claudeLeadData, selectedIndustry),
    enabled: false
  });

  const { data: criteriaSuggestions, isLoading: criteriaLoading, refetch: refetchCriteria } = useQuery({
    queryKey: ['criteria-suggestions', selectedIndustry],
    queryFn: () => aiScoringService.getCriteriaSuggestions(selectedIndustry),
    enabled: false
  });

  const { data: weightOptimization, isLoading: weightOptimizationLoading, refetch: refetchWeightOptimization } = useQuery({
    queryKey: ['weight-optimization', currentWeights, performanceData],
    queryFn: () => aiScoringService.getWeightOptimizationRecommendations(currentWeights, performanceData),
    enabled: false
  });

  const { data: claudeContentAnalysis, isLoading: claudeContentAnalysisLoading, refetch: refetchContentAnalysis } = useQuery({
    queryKey: ['claude-content-analysis', claudeAnalysisContent, selectedIndustry],
    queryFn: () => aiScoringService.analyzeLeadContent(claudeAnalysisContent, selectedIndustry),
    enabled: false
  });

  // Mutations
  const createModelMutation = useMutation({
    mutationFn: aiScoringService.createModel,
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Model created successfully'
      });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create model'
      });
    }
  });

  const updateModelStatusMutation = useMutation({
    mutationFn: ({ modelId, isActive }: { modelId: string; isActive: boolean }) =>
      aiScoringService.updateModelStatus(modelId, isActive),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Model status updated'
      });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update model status'
      });
    }
  });

  const trainModelMutation = useMutation({
    mutationFn: ({ modelId, trainingData }: { modelId: string; trainingData: Array<Record<string, unknown>> }) =>
      aiScoringService.trainModel(modelId, trainingData),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Model trained successfully'
      });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to train model'
      });
    }
  });

  const handleCreateModel = () => {
    if (!newModel.name || newModel.features.length === 0) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide model name and features'
      });
      return;
    }
    createModelMutation.mutate(newModel);
    setNewModel({ name: '', type: 'regression', features: [] });
  };

  const handleTrainModel = (modelId: string) => {
    const trainingData = aiScoringService.generateSampleTrainingData(trainingDataSize);
    trainModelMutation.mutate({ modelId, trainingData });
  };

  const handleModelStatusToggle = (modelId: string, currentStatus: boolean) => {
    updateModelStatusMutation.mutate({ modelId, isActive: !currentStatus });
  };

  // Claude AI Handlers
  const handleClaudeScoreLead = () => {
    if (!claudeLeadData.companyName || !claudeLeadData.domain) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide company name and domain'
      });
      return;
    }
    refetchClaudePrediction();
  };

  const handleGetCriteriaSuggestions = () => {
    refetchCriteria();
  };

  const handleGetWeightOptimization = () => {
    refetchWeightOptimization();
  };

  const handleAnalyzeContent = () => {
    if (!claudeAnalysisContent.trim()) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please provide content to analyze'
      });
      return;
    }
    refetchContentAnalysis();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LightBulbIcon },
    { id: 'models', label: 'Models', icon: CogIcon },
    { id: 'predictions', label: 'Predictions', icon: ChartBarSquareIcon },
    { id: 'analysis', label: 'Text Analysis', icon: DocumentTextIcon },
    { id: 'claude', label: 'Claude AI', icon: SparklesIcon },
    { id: 'config', label: 'Configuration', icon: CogIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <LightBulbIcon className="h-8 w-8 text-blue-600" />
            AI/ML Scoring
          </h1>
          <p className="text-gray-600 mt-2">
            Advanced machine learning models for predictive lead scoring and analysis
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">AI Insights Overview</h2>
              
              {insightsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : insights ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Model Stats */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm">Total Models</p>
                          <p className="text-3xl font-bold">{insights.totalModels}</p>
                        </div>
                        <ArrowTrendingUpIcon className="h-8 w-8 opacity-80" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm">Active Models</p>
                          <p className="text-3xl font-bold">{insights.activeModels}</p>
                        </div>
                        <ClockIcon className="h-8 w-8 opacity-80" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">Avg Accuracy</p>
                          <p className="text-3xl font-bold">{insights.avgAccuracy}%</p>
                        </div>
                        <ChartBarSquareIcon className="h-8 w-8 opacity-80" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100 text-sm">Model Types</p>
                          <p className="text-3xl font-bold">{Object.keys(insights.modelTypes).length}</p>
                        </div>
                        <ChartBarSquareIcon className="h-8 w-8 opacity-80" />
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Recent Model Activity</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {insights.recentActivity.length > 0 ? (
                        <div className="space-y-3">
                          {insights.recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {activity.type}
                                </div>
                                <span className="font-medium">{activity.name}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">
                                  {activity.accuracy}% accuracy
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(activity.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No recent activity</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">No insights available</p>
              )}
            </div>
          )}

          {activeTab === 'models' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">AI Models</h2>
                <button
                  onClick={() => setActiveTab('models')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create New Model
                </button>
              </div>

              {/* Create Model Form */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Create New Model</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={newModel.name}
                      onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter model name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model Type
                    </label>
                    <select
                      value={newModel.type}
                      onChange={(e) => setNewModel({ ...newModel, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="regression">Regression</option>
                      <option value="classification">Classification</option>
                      <option value="ensemble">Ensemble</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features
                    </label>
                    <input
                      type="text"
                      value={newModel.features.join(', ')}
                      onChange={(e) => setNewModel({ ...newModel, features: e.target.value.split(',').map(f => f.trim()).filter(f => f) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="companySize, industry, revenue"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateModel}
                  disabled={createModelMutation.isPending}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {createModelMutation.isPending ? 'Creating...' : 'Create Model'}
                </button>
              </div>

              {/* Models List */}
              {modelsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : models && models.length > 0 ? (
                <div className="space-y-4">
                  {models.map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {model.type}
                          </div>
                          <div>
                            <h3 className="font-semibold">{model.name}</h3>
                            <p className="text-sm text-gray-600">
                              {model.features.length} features • {model.performance.accuracy}% accuracy
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleModelStatusToggle(model.id, model.isActive)}
                            disabled={updateModelStatusMutation.isPending}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              model.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {model.isActive ? (
                              <>
                                <PauseIcon className="h-4 w-4 inline mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <PlayIcon className="h-4 w-4 inline mr-1" />
                                Inactive
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleTrainModel(model.id)}
                            disabled={trainModelMutation.isPending}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            <BoltIcon className="h-4 w-4 inline mr-1" />
                            Train
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No models available</p>
              )}
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">AI Predictions</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Prediction */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Lead Score Prediction</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lead ID
                      </label>
                      <input
                        type="text"
                        value={selectedLeadId}
                        onChange={(e) => setSelectedLeadId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter lead ID"
                      />
                    </div>
                    
                    {predictionLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : prediction ? (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Predicted Score</span>
                            <span className="text-lg font-bold text-blue-600">
                              {prediction.score.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${prediction.score}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Confidence</p>
                            <p className="text-lg font-bold text-green-600">
                              {prediction.confidence}%
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-1">Risk Level</p>
                            <p className="text-lg font-bold text-orange-600">
                              {prediction.riskLevel.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Key Factors</p>
                          <div className="space-y-1">
                            {prediction.factors.map((factor, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span className="text-sm">{factor}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommendations</p>
                          <div className="space-y-1">
                            {prediction.recommendations.map((rec, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                <span className="text-sm">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : selectedLeadId ? (
                      <p className="text-gray-500 text-center py-4">No prediction available</p>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Enter a lead ID to get prediction</p>
                    )}
                  </div>
                </div>

                {/* Bulk Predictions */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Bulk Predictions</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate predictions for multiple leads at once
                  </p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                    <ArrowUpTrayIcon className="h-4 w-4 inline mr-2" />
                    Upload Lead IDs
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Text Analysis</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Text Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text to Analyze
                    </label>
                    <textarea
                      value={analysisText}
                      onChange={(e) => setAnalysisText(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter text content for sentiment analysis and keyword extraction..."
                    />
                  </div>
                  <button
                    onClick={() => setAnalysisText('')}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Clear Text
                  </button>
                </div>

                {/* Analysis Results */}
                <div>
                  {analysisLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : textAnalysis ? (
                    <div className="space-y-4">
                      {/* Sentiment */}
                      <div className="bg-white rounded-lg p-4 border">
                        <h3 className="text-lg font-semibold mb-3">Sentiment Analysis</h3>
                        <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {textAnalysis.sentiment.toUpperCase()}
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="bg-white rounded-lg p-4 border">
                        <h3 className="text-lg font-semibold mb-3">Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {textAnalysis.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="bg-white rounded-lg p-4 border">
                        <h3 className="text-lg font-semibold mb-3">Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {textAnalysis.topics.map((topic, index) => (
                            <span
                              key={index}
                              className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : analysisText ? (
                    <p className="text-gray-500 text-center py-8">Enter more text for analysis</p>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Enter text to analyze</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'claude' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Claude AI</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={claudeLeadData.companyName}
                      onChange={(e) => setClaudeLeadData({ ...claudeLeadData, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <select
                      value={claudeLeadData.industry}
                      onChange={(e) => setClaudeLeadData({ ...claudeLeadData, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="dental">Dental</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="technology">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="retail">Retail</option>
                      <option value="education">Education</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={claudeLeadData.domain}
                      onChange={(e) => setClaudeLeadData({ ...claudeLeadData, domain: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter domain"
                    />
                  </div>
                </div>

                {/* Content Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      value={claudeAnalysisContent}
                      onChange={(e) => setClaudeAnalysisContent(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter content for analysis"
                    />
                  </div>
                  <button
                    onClick={handleAnalyzeContent}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Analyze Content
                  </button>
                </div>
              </div>

              {/* Prediction Results */}
              <div className="mt-8">
                {claudePredictionLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : claudePrediction ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Predicted Score</span>
                        <span className="text-lg font-bold text-blue-600">
                          {claudePrediction.score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${claudePrediction.score}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Confidence</p>
                        <p className="text-lg font-bold text-green-600">
                          {claudePrediction.confidence}%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Risk Level</p>
                        <p className="text-lg font-bold text-orange-600">
                          {claudePrediction.riskLevel.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Key Factors</p>
                      <div className="space-y-1">
                        {claudePrediction.factors.map((factor, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm">{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommendations</p>
                      <div className="space-y-1">
                        {claudePrediction.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            <span className="text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No prediction available</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="p-6">
              <ClaudeConfigPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIScoringPage; 