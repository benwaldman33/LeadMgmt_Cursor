import { PrismaClient } from '@prisma/client';
import { Matrix } from 'ml-matrix';
import { PolynomialRegression } from 'ml-regression';
import natural from 'natural';
import compromise from 'compromise';
import { AuditLogService } from './auditLogService';

const prisma = new PrismaClient();

// Claude API Configuration - will be loaded from database
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Helper function to get configuration from database
async function getConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    return config?.value || null;
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return null;
  }
}

// Helper function to decrypt configuration if needed
async function getDecryptedConfig(key: string): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });
    
    if (!config) return null;
    
    if (config.isEncrypted) {
      // For now, return the encrypted value - in production you'd decrypt it
      return '[ENCRYPTED]';
    }
    
    return config.value;
  } catch (error) {
    console.error(`Error getting decrypted config ${key}:`, error);
    return null;
  }
}

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

export interface ScoringPrediction {
  score: number;
  confidence: number;
  modelId: string;
  features: string[];
  predictionTime: Date;
}

export interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AIScoringService {
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

  // Claude API Integration Methods

  /**
   * Call Claude API for lead scoring
   */
  async scoreLeadWithClaude(leadData: any, industry: string = 'dental'): Promise<MLPrediction> {
    const CLAUDE_API_KEY = await getDecryptedConfig('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    try {
      const prompt = this.buildScoringPrompt(leadData, industry);
      const response = await this.callClaudeAPI(prompt);
      
      return this.parseClaudeScoringResponse(response);
    } catch (error) {
      console.error('Error scoring lead with Claude:', error);
      throw error;
    }
  }

  /**
   * Get criteria suggestions from Claude for a specific industry
   */
  async getCriteriaSuggestions(industry: string): Promise<{
    criteria: Array<{ name: string; weight: number; description: string }>;
    reasoning: string;
  }> {
    const CLAUDE_API_KEY = await getDecryptedConfig('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    try {
      const prompt = this.buildCriteriaPrompt(industry);
      const response = await this.callClaudeAPI(prompt);
      
      return this.parseCriteriaResponse(response);
    } catch (error) {
      console.error('Error getting criteria suggestions:', error);
      throw error;
    }
  }

  /**
   * Get weight optimization recommendations
   */
  async getWeightOptimizationRecommendations(
    currentWeights: Record<string, number>,
    performanceData: any
  ): Promise<{
    recommendations: string[];
    suggestedWeights: Record<string, number>;
    reasoning: string;
  }> {
    const CLAUDE_API_KEY = await getDecryptedConfig('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    try {
      const prompt = this.buildWeightOptimizationPrompt(currentWeights, performanceData);
      const response = await this.callClaudeAPI(prompt);
      
      return this.parseWeightOptimizationResponse(response);
    } catch (error) {
      console.error('Error getting weight optimization:', error);
      throw error;
    }
  }

  /**
   * Analyze lead content with Claude
   */
  async analyzeLeadContent(content: string, industry: string = 'dental'): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
    topics: string[];
    industryRelevance: number;
    insights: string[];
  }> {
    const CLAUDE_API_KEY = await getDecryptedConfig('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    try {
      const prompt = this.buildContentAnalysisPrompt(content, industry);
      const response = await this.callClaudeAPI(prompt);
      
      return this.parseContentAnalysisResponse(response);
    } catch (error) {
      console.error('Error analyzing lead content:', error);
      throw error;
    }
  }

  // Private Claude API helper methods

  private async callClaudeAPI(prompt: string): Promise<ClaudeResponse> {
    const CLAUDE_API_KEY = await getDecryptedConfig('CLAUDE_API_KEY');
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    // Get model configuration from database
    const model = await getConfig('CLAUDE_MODEL') || 'claude-3-sonnet-20240229';
    const maxTokens = await getConfig('CLAUDE_MAX_TOKENS') || '4000';

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: parseInt(maxTokens),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private buildScoringPrompt(leadData: any, industry: string): string {
    return `You are an AI expert in lead scoring for the ${industry} industry. 

Analyze the following lead data and provide a comprehensive scoring assessment:

Lead Data:
- Company: ${leadData.companyName || 'Unknown'}
- Industry: ${leadData.industry || 'Unknown'}
- Domain: ${leadData.domain || 'Unknown'}
- Content: ${leadData.content?.substring(0, 1000) || 'No content available'}
- Technologies: ${leadData.technologies?.join(', ') || 'None detected'}
- Certifications: ${leadData.certifications?.join(', ') || 'None detected'}

Please provide your assessment in the following JSON format:
{
  "score": <number between 0-100>,
  "confidence": <number between 0-1>,
  "factors": ["factor1", "factor2", "factor3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "riskLevel": "low|medium|high",
  "reasoning": "detailed explanation of the scoring decision"
}

Focus on ${industry}-specific factors and industry relevance.`;
  }

  private buildCriteriaPrompt(industry: string): string {
    return `You are an expert in lead scoring criteria for the ${industry} industry.

Please suggest optimal scoring criteria for ${industry} leads. Consider:
- Industry-specific factors
- Technology adoption patterns
- Certification requirements
- Market maturity indicators
- Growth potential factors

Provide your response in this JSON format:
{
  "criteria": [
    {
      "name": "criteria name",
      "weight": <number between 0-100>,
      "description": "explanation of this criteria"
    }
  ],
  "reasoning": "explanation of why these criteria are optimal for this industry"
}

Ensure the weights sum to 100.`;
  }

  private buildWeightOptimizationPrompt(
    currentWeights: Record<string, number>,
    performanceData: any
  ): string {
    return `You are an expert in optimizing lead scoring weights based on performance data.

Current weights: ${JSON.stringify(currentWeights)}
Performance data: ${JSON.stringify(performanceData)}

Please analyze the performance and suggest optimized weights. Provide your response in this JSON format:
{
  "recommendations": ["recommendation1", "recommendation2"],
  "suggestedWeights": {
    "criteria1": <new_weight>,
    "criteria2": <new_weight>
  },
  "reasoning": "explanation of the optimization strategy"
}

Ensure the suggested weights sum to 100.`;
  }

  private buildContentAnalysisPrompt(content: string, industry: string): string {
    return `You are an expert in analyzing lead content for the ${industry} industry.

Analyze the following content and provide insights:

Content: ${content.substring(0, 2000)}

Please provide your analysis in this JSON format:
{
  "sentiment": "positive|negative|neutral",
  "keywords": ["keyword1", "keyword2"],
  "topics": ["topic1", "topic2"],
  "industryRelevance": <number between 0-1>,
  "insights": ["insight1", "insight2"]
}

Focus on ${industry}-specific relevance and business potential.`;
  }

  private parseClaudeScoringResponse(response: ClaudeResponse): MLPrediction {
    try {
      const content = response.content[0]?.text;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        score: Math.max(0, Math.min(100, parsed.score || 0)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        factors: parsed.factors || [],
        recommendations: parsed.recommendations || [],
        riskLevel: parsed.riskLevel || 'medium'
      };
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      throw new Error('Failed to parse Claude API response');
    }
  }

  private parseCriteriaResponse(response: ClaudeResponse): {
    criteria: Array<{ name: string; weight: number; description: string }>;
    reasoning: string;
  } {
    try {
      const content = response.content[0]?.text;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        criteria: parsed.criteria || [],
        reasoning: parsed.reasoning || ''
      };
    } catch (error) {
      console.error('Error parsing criteria response:', error);
      throw new Error('Failed to parse Claude API response');
    }
  }

  private parseWeightOptimizationResponse(response: ClaudeResponse): {
    recommendations: string[];
    suggestedWeights: Record<string, number>;
    reasoning: string;
  } {
    try {
      const content = response.content[0]?.text;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        recommendations: parsed.recommendations || [],
        suggestedWeights: parsed.suggestedWeights || {},
        reasoning: parsed.reasoning || ''
      };
    } catch (error) {
      console.error('Error parsing weight optimization response:', error);
      throw new Error('Failed to parse Claude API response');
    }
  }

  private parseContentAnalysisResponse(response: ClaudeResponse): {
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
    topics: string[];
    industryRelevance: number;
    insights: string[];
  } {
    try {
      const content = response.content[0]?.text;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        sentiment: parsed.sentiment || 'neutral',
        keywords: parsed.keywords || [],
        topics: parsed.topics || [],
        industryRelevance: Math.max(0, Math.min(1, parsed.industryRelevance || 0)),
        insights: parsed.insights || []
      };
    } catch (error) {
      console.error('Error parsing content analysis response:', error);
      throw new Error('Failed to parse Claude API response');
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
          performance: JSON.stringify(performance),
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
            const performance = JSON.parse(dbModel.performance);
            confidences.push(performance.accuracy);
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

  // Calculate industry score based on predefined values
  private calculateIndustryScore(industry: string): number {
    const industryScores: { [key: string]: number } = {
      'technology': 85,
      'healthcare': 80,
      'finance': 75,
      'manufacturing': 70,
      'retail': 65,
      'education': 60,
      'real_estate': 55,
      'other': 50
    };
    
    return industryScores[industry?.toLowerCase()] || 50;
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
    return Math.floor(Math.random() * 10) + 1;
  }

  // Calculate social presence score
  private calculateSocialPresence(enrichment: any): number {
    let score = 0;
    if (enrichment.linkedinUrl) score += 20;
    if (enrichment.twitterUrl) score += 15;
    if (enrichment.facebookUrl) score += 10;
    return Math.min(100, score);
  }

  // Calculate funding stage score
  private calculateFundingStage(enrichment: any): number {
    const fundingStages: { [key: string]: number } = {
      'seed': 30,
      'series_a': 50,
      'series_b': 70,
      'series_c': 85,
      'ipo': 95
    };
    
    return fundingStages[enrichment.fundingStage] || 0;
  }

  // Calculate ensemble score from multiple models
  private calculateEnsembleScore(predictions: number[], confidences: number[]): number {
    if (predictions.length === 0) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const weight = confidences[i] || 0.5;
      weightedSum += predictions[i] * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Calculate confidence from multiple models
  private calculateConfidence(predictions: number[], confidences: number[]): number {
    if (predictions.length === 0) return 0;
    
    // Average confidence weighted by prediction variance
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
    
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const consistencyBonus = Math.max(0, 1 - variance / 100);
    
    return Math.min(1, avgConfidence * consistencyBonus);
  }

  // Analyze factors that influenced the score
  private analyzeFactors(lead: any, features: MLFeatures): string[] {
    const factors: string[] = [];
    
    if (features.companySize > 1000) factors.push('Large company size');
    if (features.industryScore > 80) factors.push('High-value industry');
    if (features.technologyCount > 5) factors.push('Technology-forward company');
    if (features.domainAge > 5) factors.push('Established domain');
    if (features.socialPresence > 50) factors.push('Strong social presence');
    if (features.fundingStage > 70) factors.push('Advanced funding stage');
    
    return factors;
  }

  // Generate recommendations based on score
  private generateRecommendations(lead: any, score: number): string[] {
    const recommendations: string[] = [];
    
    if (score < 30) {
      recommendations.push('Consider manual review');
      recommendations.push('Gather more company information');
    } else if (score < 60) {
      recommendations.push('Monitor lead progression');
      recommendations.push('Consider additional enrichment');
    } else if (score > 80) {
      recommendations.push('High priority lead');
      recommendations.push('Consider immediate outreach');
    }
    
    return recommendations;
  }

  // Assess risk level based on score and confidence
  private assessRiskLevel(score: number, confidence: number): 'low' | 'medium' | 'high' {
    if (score > 70 && confidence > 0.8) return 'low';
    if (score < 30 || confidence < 0.5) return 'high';
    return 'medium';
  }

  // Calculate performance metrics
  private calculatePerformance(actual: number[], predicted: number[]): ModelPerformance {
    if (actual.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        trainingDate: new Date(),
        sampleSize: 0
      };
    }

    let correct = 0;
    let total = actual.length;
    
    for (let i = 0; i < actual.length; i++) {
      const error = Math.abs(actual[i] - predicted[i]);
      if (error < 5) correct++; // Within 5 points
    }
    
    const accuracy = correct / total;
    const precision = accuracy; // Simplified for regression
    const recall = accuracy; // Simplified for regression
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      trainingDate: new Date(),
      sampleSize: total
    };
  }

  // Load model from database
  private async loadModel(modelId: string) {
    try {
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId }
      });
      
      if (model && model.isActive) {
        // In a real implementation, you would load the actual model
        // For now, we'll create a simple placeholder
        this.models.set(modelId, {
          predict: (features: number[]) => Math.random() * 100
        });
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
    }
  }

  // Get model performance
  async getModelPerformance(modelId: string): Promise<ModelPerformance | null> {
    try {
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId }
      });
      
      if (!model) return null;
      
      return JSON.parse(model.performance);
    } catch (error) {
      console.error('Error getting model performance:', error);
      return null;
    }
  }

  // Get all active models
  async getActiveModels(): Promise<AIModel[]> {
    const models = await prisma.aIModel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return models.map(model => ({
      id: model.id,
      name: model.name,
      type: model.type as 'regression' | 'classification' | 'ensemble',
      features: JSON.parse(model.features),
      performance: JSON.parse(model.performance),
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    }));
  }

  // Create new AI model
  async createModel(modelData: {
    name: string;
    type: 'regression' | 'classification' | 'ensemble';
    features: string[];
  }): Promise<AIModel> {
    const defaultPerformance: ModelPerformance = {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      trainingDate: new Date(),
      sampleSize: 0
    };

    const model = await prisma.aIModel.create({
      data: {
        name: modelData.name,
        type: modelData.type,
        features: JSON.stringify(modelData.features),
        performance: JSON.stringify(defaultPerformance),
        isActive: true
      }
    });

    await AuditLogService.logActivity({
      action: 'CREATE',
      entityType: 'AI_MODEL',
      entityId: model.id,
      description: `Created AI model: ${model.name}`
    });

    return {
      id: model.id,
      name: model.name,
      type: model.type as 'regression' | 'classification' | 'ensemble',
      features: JSON.parse(model.features),
      performance: JSON.parse(model.performance),
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }

  // Update model status
  async updateModelStatus(modelId: string, isActive: boolean): Promise<void> {
    await prisma.aIModel.update({
      where: { id: modelId },
      data: { isActive }
    });

    await AuditLogService.logActivity({
      action: 'UPDATE',
      entityType: 'AI_MODEL',
      entityId: modelId,
      description: `Updated AI model status: ${isActive ? 'activated' : 'deactivated'}`
    });
  }

  // Analyze text using NLP
  async analyzeText(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
    topics: string[];
  }> {
    try {
      // Tokenize and analyze text
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      const doc = compromise(text);
      
      // Extract keywords
      const keywords = tokens?.filter(token => 
        token && token.length > 3 && !['the', 'and', 'for', 'with'].includes(token)
      ) || [];
      
      // Extract topics using compromise
      const topics = doc.topics().out('array');
      
      // Simple sentiment analysis
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'outstanding'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
      
      const positiveCount = tokens?.filter(token => positiveWords.includes(token)).length || 0;
      const negativeCount = tokens?.filter(token => negativeWords.includes(token)).length || 0;
      
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';
      
      return {
        sentiment,
        keywords: keywords.slice(0, 10),
        topics: topics.slice(0, 5)
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

  // Get all models
  async getAllModels(): Promise<AIModel[]> {
    const models = await prisma.aIModel.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return models.map(model => ({
      id: model.id,
      name: model.name,
      type: model.type as 'regression' | 'classification' | 'ensemble',
      features: JSON.parse(model.features),
      performance: JSON.parse(model.performance),
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    }));
  }

  // Get model by ID
  async getModelById(id: string): Promise<AIModel | null> {
    const model = await prisma.aIModel.findUnique({
      where: { id }
    });

    if (!model) return null;

    return {
      id: model.id,
      name: model.name,
      type: model.type as 'regression' | 'classification' | 'ensemble',
      features: JSON.parse(model.features),
      performance: JSON.parse(model.performance),
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  }

  // Score a lead using AI models
  async scoreLead(leadId: string, modelIds?: string[]): Promise<ScoringPrediction[]> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        enrichment: true,
        scoringDetails: true
      }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get active models
    const models = modelIds 
      ? await prisma.aIModel.findMany({ where: { id: { in: modelIds }, isActive: true } })
      : await prisma.aIModel.findMany({ where: { isActive: true } });

    const predictions: ScoringPrediction[] = [];

    for (const model of models) {
      try {
        const features = this.extractLeadFeaturesForModel(lead, JSON.parse(model.features));
        const prediction = await this.predictScoreWithModel(model, features);
        
        predictions.push({
          score: prediction.score,
          confidence: prediction.confidence,
          modelId: model.id,
          features: features,
          predictionTime: new Date()
        });
      } catch (error) {
        console.error(`Error scoring with model ${model.id}:`, error);
      }
    }

    // Update lead with best prediction
    if (predictions.length > 0) {
      const bestPrediction = predictions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          score: bestPrediction.score,
          lastScoredAt: new Date()
        }
      });
    }

    return predictions;
  }

  // Extract features for specific model
  private extractLeadFeaturesForModel(lead: any, requiredFeatures: string[]): string[] {
    const features: string[] = [];
    
    for (const feature of requiredFeatures) {
      switch (feature) {
        case 'company_size':
          features.push(lead.enrichment?.companySize?.toString() || '0');
          break;
        case 'industry':
          features.push(lead.industry || 'unknown');
          break;
        case 'domain_age':
          features.push(this.calculateDomainAge(lead.domain).toString());
          break;
        case 'has_technologies':
          features.push(lead.enrichment?.technologies ? '1' : '0');
          break;
        case 'technology_count':
          const techCount = lead.enrichment?.technologies 
            ? JSON.parse(lead.enrichment.technologies).length 
            : 0;
          features.push(techCount.toString());
          break;
        default:
          features.push('0');
      }
    }
    
    return features;
  }

  // Predict score using specific model
  private async predictScoreWithModel(model: any, features: string[]): Promise<{ score: number; confidence: number }> {
    // Simplified AI prediction logic
    // In a real implementation, this would call an actual ML model
    
    const baseScore = Math.random() * 100;
    const featureBonus = features.reduce((sum, feature) => {
      const numValue = parseFloat(feature) || 0;
      return sum + (numValue * 0.1);
    }, 0);
    
    const score = Math.min(100, Math.max(0, baseScore + featureBonus));
    const confidence = 0.7 + (Math.random() * 0.3); // 70-100% confidence
    
    return { score, confidence };
  }

  // Compare model performances
  async compareModels(modelIds: string[]): Promise<any[]> {
    const models = await Promise.all(
      modelIds.map(id => this.getModelById(id))
    );

    return models.filter(Boolean).map(model => ({
      id: model!.id,
      name: model!.name,
      type: model!.type,
      performance: model!.performance,
      isActive: model!.isActive
    }));
  }

  // Get model recommendations for lead
  async getModelRecommendations(leadId: string): Promise<AIModel[]> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { enrichment: true }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get all active models
    const models = await this.getAllModels();
    
    // Simple recommendation logic based on industry
    const industryModels = models.filter(model => 
      model.features.includes('industry')
    );

    return industryModels.length > 0 ? industryModels : models.slice(0, 3);
  }
}

export const aiScoringService = new AIScoringService(); 