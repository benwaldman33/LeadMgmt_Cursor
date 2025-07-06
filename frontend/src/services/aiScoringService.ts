import api from './api';

export interface MLPrediction {
  score: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDate: Date;
  sampleSize: number;
}

export interface AIModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'ensemble';
  features: string[];
  performance: ModelPerformance;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

class AIScoringService {
  // Get AI prediction for a lead
  async predictScore(leadId: string): Promise<MLPrediction> {
    try {
      const response = await api.post('/ai-scoring/predict', { leadId });
      return response.data.data;
    } catch (error) {
      console.error('Error predicting score:', error);
      throw error;
    }
  }

  // Get all active AI models
  async getModels(): Promise<AIModel[]> {
    try {
      const response = await api.get('/ai-scoring/models');
      return response.data.data;
    } catch (error) {
      console.error('Error getting models:', error);
      throw error;
    }
  }

  // Create a new AI model
  async createModel(modelData: {
    name: string;
    type: 'regression' | 'classification' | 'ensemble';
    features: string[];
  }): Promise<AIModel> {
    try {
      const response = await api.post('/ai-scoring/models', modelData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }

  // Update model status
  async updateModelStatus(modelId: string, isActive: boolean): Promise<void> {
    try {
      await api.patch(`/ai-scoring/models/${modelId}`, { isActive });
    } catch (error) {
      console.error('Error updating model status:', error);
      throw error;
    }
  }

  // Get model performance
  async getModelPerformance(modelId: string): Promise<ModelPerformance | null> {
    try {
      const response = await api.get(`/ai-scoring/models/${modelId}/performance`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting model performance:', error);
      throw error;
    }
  }

  // Train a model
  async trainModel(modelId: string, trainingData: any[]): Promise<ModelPerformance> {
    try {
      const response = await api.post(`/ai-scoring/models/${modelId}/train`, {
        trainingData
      });
      return response.data.data;
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }

  // Analyze text content
  async analyzeText(text: string): Promise<TextAnalysis> {
    try {
      const response = await api.post('/ai-scoring/analyze-text', { text });
      return response.data.data;
    } catch (error) {
      console.error('Error analyzing text:', error);
      throw error;
    }
  }

  // Get AI insights for dashboard
  async getInsights(): Promise<AIInsights> {
    try {
      const response = await api.get('/ai-scoring/insights');
      return response.data.data;
    } catch (error) {
      console.error('Error getting AI insights:', error);
      throw error;
    }
  }

  // Bulk predict scores for multiple leads
  async bulkPredict(leadIds: string[]): Promise<BulkPredictionResult> {
    try {
      const response = await api.post('/ai-scoring/bulk-predict', { leadIds });
      return response.data.data;
    } catch (error) {
      console.error('Error bulk predicting scores:', error);
      throw error;
    }
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

  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
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