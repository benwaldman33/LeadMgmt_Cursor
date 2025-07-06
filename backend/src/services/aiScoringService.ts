import { PrismaClient } from '@prisma/client';
import { Matrix } from 'ml-matrix';
import { PolynomialRegression } from 'ml-regression';
import natural from 'natural';
import compromise from 'compromise';

const prisma = new PrismaClient();

export interface MLFeatures {
  companySize: number;
  industryScore: number;
  technologyCount: number;
  domainAge: number;
  socialPresence: number;
  fundingStage: number;
  growthRate: number;
  marketCap: number;
  employeeCount: number;
  revenue: number;
}

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

class AIScoringService {
  private models: Map<string, any> = new Map();
  private tokenizer = new natural.WordTokenizer();
  private classifier = new natural.BayesClassifier();

  // Initialize AI models
  async initializeModels() {
    try {
      // Load existing models from database
      const dbModels = await prisma.aIModel.findMany({
        where: { isActive: true }
      });

      for (const model of dbModels) {
        await this.loadModel(model.id);
      }

      console.log(`Loaded ${dbModels.length} AI models`);
    } catch (error) {
      console.error('Error initializing AI models:', error);
    }
  }

  // Train a new ML model
  async trainModel(modelId: string, trainingData: any[]) {
    try {
      const features = this.extractFeatures(trainingData);
      const labels = trainingData.map(item => item.score || 0);

      // Create and train regression model
      const regression = new PolynomialRegression(features, labels, {
        degree: 2
      });

      // Store model
      this.models.set(modelId, regression);

      // Calculate performance metrics
      const predictions = features.map(feature => regression.predict(feature));
      const performance = this.calculatePerformance(labels, predictions);

      // Update model in database
      await prisma.aIModel.update({
        where: { id: modelId },
        data: {
          performance: performance,
          updatedAt: new Date()
        }
      });

      return performance;
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }

  // Predict lead score using ML
  async predictScore(leadId: string): Promise<MLPrediction> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          enrichment: true,
          scoringDetails: true,
          campaign: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Extract features
      const features = this.extractLeadFeatures(lead);
      
      // Get predictions from all active models
      const predictions: number[] = [];
      const confidences: number[] = [];

      for (const [modelId, model] of this.models) {
        try {
          const prediction = model.predict(features);
          predictions.push(prediction);
          
          // Calculate confidence based on model performance
          const dbModel = await prisma.aIModel.findUnique({
            where: { id: modelId }
          });
          
          if (dbModel) {
            confidences.push(dbModel.performance.accuracy);
          }
        } catch (error) {
          console.error(`Error with model ${modelId}:`, error);
        }
      }

      // Ensemble prediction (weighted average)
      const finalScore = this.calculateEnsembleScore(predictions, confidences);
      const confidence = this.calculateConfidence(predictions, confidences);
      
      // Analyze factors
      const factors = this.analyzeFactors(lead, features);
      const recommendations = this.generateRecommendations(lead, finalScore);
      const riskLevel = this.assessRiskLevel(finalScore, confidence);

      return {
        score: Math.max(0, Math.min(100, finalScore)),
        confidence,
        factors,
        recommendations,
        riskLevel
      };
    } catch (error) {
      console.error('Error predicting score:', error);
      throw error;
    }
  }

  // Extract features from training data
  private extractFeatures(trainingData: any[]): number[][] {
    return trainingData.map(item => {
      const features = this.extractLeadFeatures(item);
      return Object.values(features);
    });
  }

  // Extract features from a single lead
  private extractLeadFeatures(lead: any): MLFeatures {
    const enrichment = lead.enrichment || {};
    
    return {
      companySize: enrichment.companySize || 0,
      industryScore: this.calculateIndustryScore(lead.industry),
      technologyCount: this.countTechnologies(enrichment.technologies),
      domainAge: this.calculateDomainAge(lead.domain),
      socialPresence: this.calculateSocialPresence(enrichment),
      fundingStage: this.calculateFundingStage(enrichment),
      growthRate: enrichment.growthRate || 0,
      marketCap: enrichment.marketCap || 0,
      employeeCount: enrichment.employeeCount || 0,
      revenue: enrichment.revenue || 0
    };
  }

  // Calculate industry score based on historical performance
  private calculateIndustryScore(industry: string): number {
    const industryScores: { [key: string]: number } = {
      'Technology': 85,
      'Healthcare': 80,
      'Finance': 75,
      'Manufacturing': 70,
      'Retail': 65,
      'Education': 60,
      'Real Estate': 55,
      'Transportation': 50,
      'Energy': 45,
      'Agriculture': 40
    };

    return industryScores[industry] || 50;
  }

  // Count technologies from enrichment data
  private countTechnologies(technologies: string): number {
    if (!technologies) return 0;
    try {
      const techArray = JSON.parse(technologies);
      return Array.isArray(techArray) ? techArray.length : 0;
    } catch {
      return 0;
    }
  }

  // Calculate domain age (simplified)
  private calculateDomainAge(domain: string): number {
    // Simplified domain age calculation
    // In production, you'd use a domain age API
    return Math.floor(Math.random() * 10) + 1;
  }

  // Calculate social presence score
  private calculateSocialPresence(enrichment: any): number {
    let score = 0;
    
    if (enrichment.linkedinFollowers) score += 20;
    if (enrichment.twitterFollowers) score += 15;
    if (enrichment.facebookLikes) score += 10;
    if (enrichment.instagramFollowers) score += 5;
    
    return Math.min(100, score);
  }

  // Calculate funding stage score
  private calculateFundingStage(enrichment: any): number {
    const fundingStages: { [key: string]: number } = {
      'Seed': 30,
      'Series A': 50,
      'Series B': 70,
      'Series C': 85,
      'Series D': 90,
      'IPO': 95,
      'Public': 100
    };

    return fundingStages[enrichment.fundingStage] || 0;
  }

  // Calculate ensemble score from multiple models
  private calculateEnsembleScore(predictions: number[], confidences: number[]): number {
    if (predictions.length === 0) return 50;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < predictions.length; i++) {
      const weight = confidences[i] || 0.5;
      weightedSum += predictions[i] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  // Calculate confidence score
  private calculateConfidence(predictions: number[], confidences: number[]): number {
    if (predictions.length === 0) return 0.5;

    // Average confidence weighted by model performance
    let weightedConfidence = 0;
    let totalWeight = 0;

    for (let i = 0; i < confidences.length; i++) {
      const weight = confidences[i] || 0.5;
      weightedConfidence += confidences[i] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;
  }

  // Analyze factors that influenced the score
  private analyzeFactors(lead: any, features: MLFeatures): string[] {
    const factors: string[] = [];

    if (features.companySize > 1000) {
      factors.push('Large company size');
    }

    if (features.industryScore > 80) {
      factors.push('High-performing industry');
    }

    if (features.technologyCount > 5) {
      factors.push('Technology-forward company');
    }

    if (features.socialPresence > 70) {
      factors.push('Strong social media presence');
    }

    if (features.revenue > 1000000) {
      factors.push('High revenue potential');
    }

    return factors;
  }

  // Generate recommendations based on score
  private generateRecommendations(lead: any, score: number): string[] {
    const recommendations: string[] = [];

    if (score < 30) {
      recommendations.push('Consider nurturing campaign');
      recommendations.push('Focus on education content');
      recommendations.push('Longer sales cycle expected');
    } else if (score < 60) {
      recommendations.push('Qualify with additional criteria');
      recommendations.push('Consider mid-funnel content');
      recommendations.push('Monitor engagement closely');
    } else if (score < 80) {
      recommendations.push('High priority lead');
      recommendations.push('Direct sales approach recommended');
      recommendations.push('Consider immediate follow-up');
    } else {
      recommendations.push('Hot lead - immediate attention');
      recommendations.push('Premium service offering');
      recommendations.push('Executive-level engagement');
    }

    return recommendations;
  }

  // Assess risk level
  private assessRiskLevel(score: number, confidence: number): 'low' | 'medium' | 'high' {
    if (score > 70 && confidence > 0.7) return 'low';
    if (score < 30 || confidence < 0.3) return 'high';
    return 'medium';
  }

  // Calculate model performance metrics
  private calculatePerformance(actual: number[], predicted: number[]): ModelPerformance {
    const n = actual.length;
    if (n === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        trainingDate: new Date(),
        sampleSize: 0
      };
    }

    // Calculate accuracy (mean absolute error)
    const mae = actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / n;
    const accuracy = Math.max(0, 100 - mae);

    // Calculate precision and recall for classification
    const threshold = 70;
    const truePositives = actual.filter((val, i) => val >= threshold && predicted[i] >= threshold).length;
    const falsePositives = actual.filter((val, i) => val < threshold && predicted[i] >= threshold).length;
    const falseNegatives = actual.filter((val, i) => val >= threshold && predicted[i] < threshold).length;

    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      trainingDate: new Date(),
      sampleSize: n
    };
  }

  // Load model from database
  private async loadModel(modelId: string) {
    try {
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId }
      });

      if (model && model.isActive) {
        // In a real implementation, you'd load the actual model weights
        // For now, we'll create a simple placeholder model
        this.models.set(modelId, {
          predict: (features: number[]) => {
            // Simple linear combination for demo
            return features.reduce((sum, val, i) => sum + val * (i + 1), 0) / features.length;
          }
        });
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
    }
  }

  // Get model performance statistics
  async getModelPerformance(modelId: string): Promise<ModelPerformance | null> {
    try {
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId }
      });

      return model?.performance || null;
    } catch (error) {
      console.error('Error getting model performance:', error);
      return null;
    }
  }

  // Get all active models
  async getActiveModels(): Promise<AIModel[]> {
    try {
      return await prisma.aIModel.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting active models:', error);
      return [];
    }
  }

  // Create a new AI model
  async createModel(modelData: {
    name: string;
    type: 'regression' | 'classification' | 'ensemble';
    features: string[];
  }): Promise<AIModel> {
    try {
      return await prisma.aIModel.create({
        data: {
          ...modelData,
          performance: {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            trainingDate: new Date(),
            sampleSize: 0
          },
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error creating model:', error);
      throw error;
    }
  }

  // Update model status
  async updateModelStatus(modelId: string, isActive: boolean): Promise<void> {
    try {
      await prisma.aIModel.update({
        where: { id: modelId },
        data: { isActive }
      });
    } catch (error) {
      console.error('Error updating model status:', error);
      throw error;
    }
  }

  // Analyze text content for sentiment and keywords
  async analyzeText(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
    topics: string[];
  }> {
    try {
      // Use compromise for NLP analysis
      const doc = compromise(text);
      
      // Extract keywords
      const keywords = doc.match('#Noun').out('array').slice(0, 10);
      
      // Extract topics
      const topics = doc.match('#Noun+').out('array').slice(0, 5);
      
      // Simple sentiment analysis
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'best', 'love', 'like'];
      const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'dislike', 'poor'];
      
      const words = this.tokenizer.tokenize(text.toLowerCase()) || [];
      const positiveCount = words.filter(word => positiveWords.includes(word)).length;
      const negativeCount = words.filter(word => negativeWords.includes(word)).length;
      
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';

      return {
        sentiment,
        keywords,
        topics
      };
    } catch (error) {
      console.error('Error analyzing text:', error);
      return {
        sentiment: 'neutral',
        keywords: [],
        topics: []
      };
    }
  }
}

export const aiScoringService = new AIScoringService(); 