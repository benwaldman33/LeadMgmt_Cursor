import api from './api';

export interface MLPrediction {
  score: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CriteriaSuggestion {
  name: string;
  weight: number;
  description: string;
}

export interface WeightOptimization {
  recommendations: string[];
  suggestedWeights: Record<string, number>;
  reasoning: string;
}

export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  topics: string[];
  industryRelevance: number;
  insights: string[];
}

export interface AIModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'ensemble';
  features: string[];
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    trainingDate: Date;
    sampleSize: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDate: Date;
  sampleSize: number;
}

export interface ScoringPrediction {
  score: number;
  confidence: number;
  modelId: string;
  features: string[];
  predictionTime: Date;
}

export interface TextAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  topics: string[];
}

export interface AIInsights {
  totalModels: number;
  activeModels: number;
  avgAccuracy: number;
  modelTypes: Record<string, number>;
  recentActivity: Array<{
    id: string;
    name: string;
    type: string;
    accuracy: number;
    updatedAt: Date;
  }>;
}

export interface BulkPredictionResult {
  predictions: Array<{ leadId: string; prediction: MLPrediction }>;
  errors: Array<{ leadId: string; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class AIScoringService {
  // Claude AI Integration Methods

  /**
   * Score a lead using Claude AI
   */
  async scoreLeadWithClaude(leadData: any, industry: string = 'dental'): Promise<MLPrediction> {
    const response = await api.post('/ai-scoring/claude/score-lead', {
      leadData,
      industry
    });
    return response.data.data;
  }

  /**
   * Get criteria suggestions from Claude for a specific industry
   */
  async getCriteriaSuggestions(industry: string): Promise<{
    criteria: CriteriaSuggestion[];
    reasoning: string;
  }> {
    const response = await api.get(`/ai-scoring/claude/criteria-suggestions/${industry}`);
    return response.data.data;
  }

  /**
   * Get weight optimization recommendations from Claude
   */
  async getWeightOptimizationRecommendations(
    currentWeights: Record<string, number>,
    performanceData: any
  ): Promise<WeightOptimization> {
    const response = await api.post('/ai-scoring/claude/weight-optimization', {
      currentWeights,
      performanceData
    });
    return response.data.data;
  }

  /**
   * Analyze lead content with Claude
   */
  async analyzeLeadContent(content: string, industry: string = 'dental'): Promise<ContentAnalysis> {
    const response = await api.post('/ai-scoring/claude/analyze-content', {
      content,
      industry
    });
    return response.data.data;
  }

  /**
   * Get Claude configuration
   */
  async getClaudeConfig(): Promise<{
    apiKey?: string;
    model: string;
    maxTokens: string;
    temperature: string;
    isConfigured: boolean;
  }> {
    const response = await api.get('/ai-scoring/claude/config');
    return response.data.data;
  }

  /**
   * Update Claude configuration
   */
  async updateClaudeConfig(config: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<void> {
    await api.post('/ai-scoring/claude/config', config);
  }

  /**
   * Test Claude API connection
   */
  async testClaudeConnection(): Promise<{
    success: boolean;
    message: string;
    model: string;
    responseTime: number;
  }> {
    const response = await api.post('/ai-scoring/claude/test-connection');
    return response.data.data;
  }

  /**
   * Get Claude API usage statistics
   */
  async getClaudeUsageStats(): Promise<{
    totalCalls: number;
    totalTokens: number;
    averageResponseTime: number;
    costEstimate: number;
    lastCall: Date | null;
  }> {
    const response = await api.get('/ai-scoring/claude/usage');
    return response.data.data;
  }

  /**
   * Compare Claude vs ML model predictions
   */
  async compareClaudeVsML(leadId: string, modelIds?: string[]): Promise<{
    claudePrediction: MLPrediction;
    mlPredictions: Array<{
      modelId: string;
      modelName: string;
      prediction: MLPrediction;
    }>;
    comparison: {
      scoreDifference: number;
      confidenceDifference: number;
      agreement: 'high' | 'medium' | 'low';
      recommendations: string[];
    };
  }> {
    const response = await api.post('/ai-scoring/claude/compare-predictions', {
      leadId,
      modelIds
    });
    return response.data.data;
  }

  /**
   * Perform enhanced content analysis
   */
  async performEnhancedAnalysis(
    content: string,
    industry: string = 'dental',
    analysisType: 'comprehensive' | 'sentiment' | 'technical' | 'business' = 'comprehensive'
  ): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
    topics: string[];
    industryRelevance: number;
    insights: string[];
    technicalAnalysis: {
      technologies: string[];
      complexity: 'low' | 'medium' | 'high';
      sophistication: number;
    };
    businessAnalysis: {
      marketPosition: string;
      growthPotential: number;
      competitiveAdvantages: string[];
      risks: string[];
    };
    recommendations: string[];
  }> {
    const response = await api.post('/ai-scoring/claude/enhanced-analysis', {
      content,
      industry,
      analysisType
    });
    return response.data.data;
  }

  // Existing ML Model Methods

  /**
   * Get AI prediction for a lead
   */
  async predictScore(leadId: string): Promise<MLPrediction> {
    const response = await api.post('/ai-scoring/predict', { leadId });
    return response.data.data;
  }

  /**
   * Get all active AI models
   */
  async getActiveModels(): Promise<AIModel[]> {
    const response = await api.get('/ai-scoring/models');
    return response.data.data;
  }

  /**
   * Get all AI models
   */
  async getAllModels(): Promise<AIModel[]> {
    const response = await api.get('/ai-scoring/models');
    return response.data.data;
  }

  /**
   * Get model by ID
   */
  async getModelById(id: string): Promise<AIModel | null> {
    const response = await api.get(`/ai-scoring/models/${id}`);
    return response.data.data;
  }

  /**
   * Create a new AI model
   */
  async createModel(modelData: {
    name: string;
    type: 'regression' | 'classification' | 'ensemble';
    features: string[];
  }): Promise<AIModel> {
    const response = await api.post('/ai-scoring/models', modelData);
    return response.data.data;
  }

  /**
   * Update model status
   */
  async updateModelStatus(modelId: string, isActive: boolean): Promise<void> {
    await api.patch(`/ai-scoring/models/${modelId}`, { isActive });
  }

  /**
   * Get model performance
   */
  async getModelPerformance(modelId: string): Promise<ModelPerformance | null> {
    const response = await api.get(`/ai-scoring/models/${modelId}/performance`);
    return response.data.data;
  }

  /**
   * Train a model
   */
  async trainModel(modelId: string, trainingData: any[]): Promise<ModelPerformance> {
    const response = await api.post(`/ai-scoring/models/${modelId}/train`, {
      trainingData
    });
    return response.data.data;
  }

  /**
   * Analyze text content
   */
  async analyzeText(text: string): Promise<TextAnalysis> {
    const response = await api.post('/ai-scoring/analyze-text', { text });
    return response.data.data;
  }

  /**
   * Get AI insights for dashboard
   */
  async getInsights(): Promise<AIInsights> {
    const response = await api.get('/ai-scoring/insights');
    return response.data.data;
  }

  /**
   * Bulk predict scores for multiple leads
   */
  async bulkPredict(leadIds: string[]): Promise<BulkPredictionResult> {
    const response = await api.post('/ai-scoring/bulk-predict', { leadIds });
    return response.data.data;
  }

  /**
   * Score lead with multiple models
   */
  async scoreLeadWithModels(leadId: string, modelIds?: string[]): Promise<ScoringPrediction[]> {
    const response = await api.post('/ai-scoring/score-lead-models', {
      leadId,
      modelIds
    });
    return response.data.data;
  }

  /**
   * Compare models
   */
  async compareModels(modelIds: string[]): Promise<any[]> {
    const response = await api.post('/ai-scoring/compare-models', { modelIds });
    return response.data.data;
  }

  /**
   * Get model recommendations for lead
   */
  async getModelRecommendations(leadId: string): Promise<AIModel[]> {
    const response = await api.get(`/ai-scoring/model-recommendations/${leadId}`);
    return response.data.data;
  }

  // Static helper methods

  /**
   * Get available model types
   */
  static getModelTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'regression', label: 'Regression' },
      { value: 'classification', label: 'Classification' },
      { value: 'ensemble', label: 'Ensemble' }
    ];
  }

  /**
   * Get available features
   */
  static getAvailableFeatures(): Array<{ value: string; label: string }> {
    return [
      { value: 'companySize', label: 'Company Size' },
      { value: 'industryScore', label: 'Industry Score' },
      { value: 'technologyCount', label: 'Technology Count' },
      { value: 'domainAge', label: 'Domain Age' },
      { value: 'socialPresence', label: 'Social Presence' },
      { value: 'fundingStage', label: 'Funding Stage' },
      { value: 'growthRate', label: 'Growth Rate' },
      { value: 'marketCap', label: 'Market Cap' },
      { value: 'employeeCount', label: 'Employee Count' },
      { value: 'revenue', label: 'Revenue' }
    ];
  }

  /**
   * Get available industries
   */
  static getAvailableIndustries(): Array<{ value: string; label: string }> {
    return [
      { value: 'dental', label: 'Dental' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'technology', label: 'Technology' },
      { value: 'finance', label: 'Finance' },
      { value: 'retail', label: 'Retail' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'education', label: 'Education' },
      { value: 'real_estate', label: 'Real Estate' },
      { value: 'legal', label: 'Legal' },
      { value: 'consulting', label: 'Consulting' }
    ];
  }

  /**
   * Format confidence as percentage
   */
  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Get risk level color
   */
  static getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get score color based on value
   */
  static getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  // Helper functions for UI
  getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high'): string {
    switch (riskLevel) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  getSentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      case 'neutral':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  formatAccuracy(accuracy: number): string {
    return `${Math.round(accuracy * 100)}%`;
  }

  getModelTypeLabel(type: string): string {
    switch (type) {
      case 'regression':
        return 'Regression';
      case 'classification':
        return 'Classification';
      case 'ensemble':
        return 'Ensemble';
      default:
        return type;
    }
  }

  getModelTypeColor(type: string): string {
    switch (type) {
      case 'regression':
        return 'bg-blue-100 text-blue-800';
      case 'classification':
        return 'bg-purple-100 text-purple-800';
      case 'ensemble':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Generate sample training data for demo
  generateSampleTrainingData(count: number = 100): any[] {
    const data = [];
    const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'];
    const statuses = ['RAW', 'SCORED', 'QUALIFIED', 'DELIVERED'];

    for (let i = 0; i < count; i++) {
      const companySize = Math.floor(Math.random() * 10000) + 10;
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const technologyCount = Math.floor(Math.random() * 20) + 1;
      const domainAge = Math.floor(Math.random() * 15) + 1;
      const socialPresence = Math.floor(Math.random() * 100);
      const fundingStage = Math.floor(Math.random() * 100);
      const growthRate = (Math.random() - 0.5) * 200; // -100 to 100
      const marketCap = Math.floor(Math.random() * 1000000000) + 1000000;
      const employeeCount = Math.floor(Math.random() * 10000) + 10;
      const revenue = Math.floor(Math.random() * 100000000) + 100000;

      // Calculate a simple score based on features
      const score = Math.min(100, Math.max(0, 
        (companySize / 1000) * 10 +
        (technologyCount * 2) +
        (domainAge * 3) +
        (socialPresence * 0.3) +
        (fundingStage * 0.5) +
        (growthRate + 100) * 0.2 +
        (marketCap / 100000000) * 5 +
        (employeeCount / 1000) * 2 +
        (revenue / 10000000) * 3
      ));

      data.push({
        id: `sample-${i}`,
        companySize,
        industry,
        technologyCount,
        domainAge,
        socialPresence,
        fundingStage,
        growthRate,
        marketCap,
        employeeCount,
        revenue,
        score,
        status: statuses[Math.floor(Math.random() * statuses.length)]
      });
    }

    return data;
  }
}

export const aiScoringService = new AIScoringService(); 