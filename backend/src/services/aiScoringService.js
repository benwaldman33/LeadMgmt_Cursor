"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiScoringService = exports.AIScoringService = void 0;
const client_1 = require("@prisma/client");
const ml_regression_1 = require("ml-regression");
const natural_1 = __importDefault(require("natural"));
const compromise_1 = __importDefault(require("compromise"));
const auditLogService_1 = require("./auditLogService");
const prisma = new client_1.PrismaClient();
// Claude API Configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
class AIScoringService {
    constructor() {
        this.models = new Map();
        this.tokenizer = new natural_1.default.WordTokenizer();
        this.classifier = new natural_1.default.BayesClassifier();
    }
    // Initialize AI models
    initializeModels() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Load existing models from database
                const dbModels = yield prisma.aIModel.findMany({
                    where: { isActive: true }
                });
                for (const model of dbModels) {
                    yield this.loadModel(model.id);
                }
                console.log(`Loaded ${dbModels.length} AI models`);
            }
            catch (error) {
                console.error('Error initializing AI models:', error);
            }
        });
    }
    // Claude API Integration Methods
    /**
     * Call Claude API for lead scoring
     */
    scoreLeadWithClaude(leadData_1) {
        return __awaiter(this, arguments, void 0, function* (leadData, industry = 'dental') {
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildScoringPrompt(leadData, industry);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseClaudeScoringResponse(response);
            }
            catch (error) {
                console.error('Error scoring lead with Claude:', error);
                throw error;
            }
        });
    }
    /**
     * Get criteria suggestions from Claude for a specific industry
     */
    getCriteriaSuggestions(industry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildCriteriaPrompt(industry);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseCriteriaResponse(response);
            }
            catch (error) {
                console.error('Error getting criteria suggestions:', error);
                throw error;
            }
        });
    }
    /**
     * Get weight optimization recommendations
     */
    getWeightOptimizationRecommendations(currentWeights, performanceData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildWeightOptimizationPrompt(currentWeights, performanceData);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseWeightOptimizationResponse(response);
            }
            catch (error) {
                console.error('Error getting weight optimization:', error);
                throw error;
            }
        });
    }
    /**
     * Analyze lead content with Claude
     */
    analyzeLeadContent(content_1) {
        return __awaiter(this, arguments, void 0, function* (content, industry = 'dental') {
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildContentAnalysisPrompt(content, industry);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseContentAnalysisResponse(response);
            }
            catch (error) {
                console.error('Error analyzing lead content:', error);
                throw error;
            }
        });
    }
    // Private Claude API helper methods
    callClaudeAPI(prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            const response = yield fetch(CLAUDE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 4000,
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
        });
    }
    buildScoringPrompt(leadData, industry) {
        var _a, _b, _c;
        return `You are an AI expert in lead scoring for the ${industry} industry. 

Analyze the following lead data and provide a comprehensive scoring assessment:

Lead Data:
- Company: ${leadData.companyName || 'Unknown'}
- Industry: ${leadData.industry || 'Unknown'}
- Domain: ${leadData.domain || 'Unknown'}
- Content: ${((_a = leadData.content) === null || _a === void 0 ? void 0 : _a.substring(0, 1000)) || 'No content available'}
- Technologies: ${((_b = leadData.technologies) === null || _b === void 0 ? void 0 : _b.join(', ')) || 'None detected'}
- Certifications: ${((_c = leadData.certifications) === null || _c === void 0 ? void 0 : _c.join(', ')) || 'None detected'}

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
    buildCriteriaPrompt(industry) {
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
    buildWeightOptimizationPrompt(currentWeights, performanceData) {
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
    buildContentAnalysisPrompt(content, industry) {
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
    parseClaudeScoringResponse(response) {
        var _a;
        try {
            const content = (_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text;
            const jsonMatch = content === null || content === void 0 ? void 0 : content.match(/\{[\s\S]*\}/);
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
        }
        catch (error) {
            console.error('Error parsing Claude response:', error);
            throw new Error('Failed to parse Claude API response');
        }
    }
    parseCriteriaResponse(response) {
        var _a;
        try {
            const content = (_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text;
            const jsonMatch = content === null || content === void 0 ? void 0 : content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid response format from Claude');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                criteria: parsed.criteria || [],
                reasoning: parsed.reasoning || ''
            };
        }
        catch (error) {
            console.error('Error parsing criteria response:', error);
            throw new Error('Failed to parse Claude API response');
        }
    }
    parseWeightOptimizationResponse(response) {
        var _a;
        try {
            const content = (_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text;
            const jsonMatch = content === null || content === void 0 ? void 0 : content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid response format from Claude');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                recommendations: parsed.recommendations || [],
                suggestedWeights: parsed.suggestedWeights || {},
                reasoning: parsed.reasoning || ''
            };
        }
        catch (error) {
            console.error('Error parsing weight optimization response:', error);
            throw new Error('Failed to parse Claude API response');
        }
    }
    parseContentAnalysisResponse(response) {
        var _a;
        try {
            const content = (_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text;
            const jsonMatch = content === null || content === void 0 ? void 0 : content.match(/\{[\s\S]*\}/);
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
        }
        catch (error) {
            console.error('Error parsing content analysis response:', error);
            throw new Error('Failed to parse Claude API response');
        }
    }
    // Train a new ML model
    trainModel(modelId, trainingData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const features = this.extractFeatures(trainingData);
                const labels = trainingData.map(item => item.score || 0);
                // Create and train regression model
                const regression = new ml_regression_1.PolynomialRegression(features, labels, {
                    degree: 2
                });
                // Store model
                this.models.set(modelId, regression);
                // Calculate performance metrics
                const predictions = features.map(feature => regression.predict(feature));
                const performance = this.calculatePerformance(labels, predictions);
                // Update model in database
                yield prisma.aIModel.update({
                    where: { id: modelId },
                    data: {
                        performance: JSON.stringify(performance),
                        updatedAt: new Date()
                    }
                });
                return performance;
            }
            catch (error) {
                console.error('Error training model:', error);
                throw error;
            }
        });
    }
    // Predict lead score using ML
    predictScore(leadId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lead = yield prisma.lead.findUnique({
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
                const predictions = [];
                const confidences = [];
                for (const [modelId, model] of this.models) {
                    try {
                        const prediction = model.predict(features);
                        predictions.push(prediction);
                        // Calculate confidence based on model performance
                        const dbModel = yield prisma.aIModel.findUnique({
                            where: { id: modelId }
                        });
                        if (dbModel) {
                            const performance = JSON.parse(dbModel.performance);
                            confidences.push(performance.accuracy);
                        }
                    }
                    catch (error) {
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
            }
            catch (error) {
                console.error('Error predicting score:', error);
                throw error;
            }
        });
    }
    // Extract features from training data
    extractFeatures(trainingData) {
        return trainingData.map(item => {
            const features = this.extractLeadFeatures(item);
            return Object.values(features);
        });
    }
    // Extract features from a single lead
    extractLeadFeatures(lead) {
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
    calculateIndustryScore(industry) {
        const industryScores = {
            'technology': 85,
            'healthcare': 80,
            'finance': 75,
            'manufacturing': 70,
            'retail': 65,
            'education': 60,
            'real_estate': 55,
            'other': 50
        };
        return industryScores[industry === null || industry === void 0 ? void 0 : industry.toLowerCase()] || 50;
    }
    // Count technologies from enrichment data
    countTechnologies(technologies) {
        if (!technologies)
            return 0;
        try {
            const techArray = JSON.parse(technologies);
            return Array.isArray(techArray) ? techArray.length : 0;
        }
        catch (_a) {
            return 0;
        }
    }
    // Calculate domain age (simplified)
    calculateDomainAge(domain) {
        // Simplified domain age calculation
        return Math.floor(Math.random() * 10) + 1;
    }
    // Calculate social presence score
    calculateSocialPresence(enrichment) {
        let score = 0;
        if (enrichment.linkedinUrl)
            score += 20;
        if (enrichment.twitterUrl)
            score += 15;
        if (enrichment.facebookUrl)
            score += 10;
        return Math.min(100, score);
    }
    // Calculate funding stage score
    calculateFundingStage(enrichment) {
        const fundingStages = {
            'seed': 30,
            'series_a': 50,
            'series_b': 70,
            'series_c': 85,
            'ipo': 95
        };
        return fundingStages[enrichment.fundingStage] || 0;
    }
    // Calculate ensemble score from multiple models
    calculateEnsembleScore(predictions, confidences) {
        if (predictions.length === 0)
            return 0;
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
    calculateConfidence(predictions, confidences) {
        if (predictions.length === 0)
            return 0;
        // Average confidence weighted by prediction variance
        const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
        const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        const consistencyBonus = Math.max(0, 1 - variance / 100);
        return Math.min(1, avgConfidence * consistencyBonus);
    }
    // Analyze factors that influenced the score
    analyzeFactors(lead, features) {
        const factors = [];
        if (features.companySize > 1000)
            factors.push('Large company size');
        if (features.industryScore > 80)
            factors.push('High-value industry');
        if (features.technologyCount > 5)
            factors.push('Technology-forward company');
        if (features.domainAge > 5)
            factors.push('Established domain');
        if (features.socialPresence > 50)
            factors.push('Strong social presence');
        if (features.fundingStage > 70)
            factors.push('Advanced funding stage');
        return factors;
    }
    // Generate recommendations based on score
    generateRecommendations(lead, score) {
        const recommendations = [];
        if (score < 30) {
            recommendations.push('Consider manual review');
            recommendations.push('Gather more company information');
        }
        else if (score < 60) {
            recommendations.push('Monitor lead progression');
            recommendations.push('Consider additional enrichment');
        }
        else if (score > 80) {
            recommendations.push('High priority lead');
            recommendations.push('Consider immediate outreach');
        }
        return recommendations;
    }
    // Assess risk level based on score and confidence
    assessRiskLevel(score, confidence) {
        if (score > 70 && confidence > 0.8)
            return 'low';
        if (score < 30 || confidence < 0.5)
            return 'high';
        return 'medium';
    }
    // Calculate performance metrics
    calculatePerformance(actual, predicted) {
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
            if (error < 5)
                correct++; // Within 5 points
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
    loadModel(modelId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const model = yield prisma.aIModel.findUnique({
                    where: { id: modelId }
                });
                if (model && model.isActive) {
                    // In a real implementation, you would load the actual model
                    // For now, we'll create a simple placeholder
                    this.models.set(modelId, {
                        predict: (features) => Math.random() * 100
                    });
                }
            }
            catch (error) {
                console.error(`Error loading model ${modelId}:`, error);
            }
        });
    }
    // Get model performance
    getModelPerformance(modelId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const model = yield prisma.aIModel.findUnique({
                    where: { id: modelId }
                });
                if (!model)
                    return null;
                return JSON.parse(model.performance);
            }
            catch (error) {
                console.error('Error getting model performance:', error);
                return null;
            }
        });
    }
    // Get all active models
    getActiveModels() {
        return __awaiter(this, void 0, void 0, function* () {
            const models = yield prisma.aIModel.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            return models.map(model => ({
                id: model.id,
                name: model.name,
                type: model.type,
                features: JSON.parse(model.features),
                performance: JSON.parse(model.performance),
                isActive: model.isActive,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt
            }));
        });
    }
    // Create new AI model
    createModel(modelData) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultPerformance = {
                accuracy: 0,
                precision: 0,
                recall: 0,
                f1Score: 0,
                trainingDate: new Date(),
                sampleSize: 0
            };
            const model = yield prisma.aIModel.create({
                data: {
                    name: modelData.name,
                    type: modelData.type,
                    features: JSON.stringify(modelData.features),
                    performance: JSON.stringify(defaultPerformance),
                    isActive: true
                }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'CREATE',
                entityType: 'AI_MODEL',
                entityId: model.id,
                description: `Created AI model: ${model.name}`
            });
            return {
                id: model.id,
                name: model.name,
                type: model.type,
                features: JSON.parse(model.features),
                performance: JSON.parse(model.performance),
                isActive: model.isActive,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt
            };
        });
    }
    // Update model status
    updateModelStatus(modelId, isActive) {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.aIModel.update({
                where: { id: modelId },
                data: { isActive }
            });
            yield auditLogService_1.AuditLogService.logActivity({
                action: 'UPDATE',
                entityType: 'AI_MODEL',
                entityId: modelId,
                description: `Updated AI model status: ${isActive ? 'activated' : 'deactivated'}`
            });
        });
    }
    // Analyze text using NLP
    analyzeText(text) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Tokenize and analyze text
                const tokens = this.tokenizer.tokenize(text.toLowerCase());
                const doc = (0, compromise_1.default)(text);
                // Extract keywords
                const keywords = (tokens === null || tokens === void 0 ? void 0 : tokens.filter(token => token && token.length > 3 && !['the', 'and', 'for', 'with'].includes(token))) || [];
                // Extract topics using compromise
                const topics = doc.topics().out('array');
                // Simple sentiment analysis
                const positiveWords = ['good', 'great', 'excellent', 'amazing', 'outstanding'];
                const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
                const positiveCount = (tokens === null || tokens === void 0 ? void 0 : tokens.filter(token => positiveWords.includes(token)).length) || 0;
                const negativeCount = (tokens === null || tokens === void 0 ? void 0 : tokens.filter(token => negativeWords.includes(token)).length) || 0;
                let sentiment = 'neutral';
                if (positiveCount > negativeCount)
                    sentiment = 'positive';
                else if (negativeCount > positiveCount)
                    sentiment = 'negative';
                return {
                    sentiment,
                    keywords: keywords.slice(0, 10),
                    topics: topics.slice(0, 5)
                };
            }
            catch (error) {
                console.error('Error analyzing text:', error);
                return {
                    sentiment: 'neutral',
                    keywords: [],
                    topics: []
                };
            }
        });
    }
    // Get all models
    getAllModels() {
        return __awaiter(this, void 0, void 0, function* () {
            const models = yield prisma.aIModel.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return models.map(model => ({
                id: model.id,
                name: model.name,
                type: model.type,
                features: JSON.parse(model.features),
                performance: JSON.parse(model.performance),
                isActive: model.isActive,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt
            }));
        });
    }
    // Get model by ID
    getModelById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = yield prisma.aIModel.findUnique({
                where: { id }
            });
            if (!model)
                return null;
            return {
                id: model.id,
                name: model.name,
                type: model.type,
                features: JSON.parse(model.features),
                performance: JSON.parse(model.performance),
                isActive: model.isActive,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt
            };
        });
    }
    // Score a lead using AI models
    scoreLead(leadId, modelIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const lead = yield prisma.lead.findUnique({
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
                ? yield prisma.aIModel.findMany({ where: { id: { in: modelIds }, isActive: true } })
                : yield prisma.aIModel.findMany({ where: { isActive: true } });
            const predictions = [];
            for (const model of models) {
                try {
                    const features = this.extractLeadFeaturesForModel(lead, JSON.parse(model.features));
                    const prediction = yield this.predictScoreWithModel(model, features);
                    predictions.push({
                        score: prediction.score,
                        confidence: prediction.confidence,
                        modelId: model.id,
                        features: features,
                        predictionTime: new Date()
                    });
                }
                catch (error) {
                    console.error(`Error scoring with model ${model.id}:`, error);
                }
            }
            // Update lead with best prediction
            if (predictions.length > 0) {
                const bestPrediction = predictions.reduce((best, current) => current.confidence > best.confidence ? current : best);
                yield prisma.lead.update({
                    where: { id: leadId },
                    data: {
                        score: bestPrediction.score,
                        lastScoredAt: new Date()
                    }
                });
            }
            return predictions;
        });
    }
    // Extract features for specific model
    extractLeadFeaturesForModel(lead, requiredFeatures) {
        var _a, _b, _c, _d;
        const features = [];
        for (const feature of requiredFeatures) {
            switch (feature) {
                case 'company_size':
                    features.push(((_b = (_a = lead.enrichment) === null || _a === void 0 ? void 0 : _a.companySize) === null || _b === void 0 ? void 0 : _b.toString()) || '0');
                    break;
                case 'industry':
                    features.push(lead.industry || 'unknown');
                    break;
                case 'domain_age':
                    features.push(this.calculateDomainAge(lead.domain).toString());
                    break;
                case 'has_technologies':
                    features.push(((_c = lead.enrichment) === null || _c === void 0 ? void 0 : _c.technologies) ? '1' : '0');
                    break;
                case 'technology_count':
                    const techCount = ((_d = lead.enrichment) === null || _d === void 0 ? void 0 : _d.technologies)
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
    predictScoreWithModel(model, features) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    // Compare model performances
    compareModels(modelIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const models = yield Promise.all(modelIds.map(id => this.getModelById(id)));
            return models.filter(Boolean).map(model => ({
                id: model.id,
                name: model.name,
                type: model.type,
                performance: model.performance,
                isActive: model.isActive
            }));
        });
    }
    // Get model recommendations for lead
    getModelRecommendations(leadId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lead = yield prisma.lead.findUnique({
                where: { id: leadId },
                include: { enrichment: true }
            });
            if (!lead) {
                throw new Error('Lead not found');
            }
            // Get all active models
            const models = yield this.getAllModels();
            // Simple recommendation logic based on industry
            const industryModels = models.filter(model => model.features.includes('industry'));
            return industryModels.length > 0 ? industryModels : models.slice(0, 3);
        });
    }
}
exports.AIScoringService = AIScoringService;
exports.aiScoringService = new AIScoringService();
