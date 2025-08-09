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
const natural_1 = __importDefault(require("natural"));
const compromise_1 = __importDefault(require("compromise"));
const auditLogService_1 = require("./auditLogService");
const prisma = new client_1.PrismaClient();
// Claude API Configuration - will be loaded from database
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
class ClaudeRateLimiter {
    constructor() {
        this.callsThisMinute = 0;
        this.lastReset = Date.now();
        this.maxCallsPerMinute = 50; // Claude's rate limit
        this.usage = {
            totalCalls: 0,
            totalTokens: 0,
            lastCall: null,
            averageResponseTime: 0,
            errors: 0
        };
    }
    checkRateLimit() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (now - this.lastReset >= 60000) {
                this.callsThisMinute = 0;
                this.lastReset = now;
            }
            if (this.callsThisMinute >= this.maxCallsPerMinute) {
                return false;
            }
            this.callsThisMinute++;
            return true;
        });
    }
    recordCall(tokens, responseTime, success) {
        this.usage.totalCalls++;
        this.usage.totalTokens += tokens;
        this.usage.lastCall = new Date();
        if (success) {
            this.usage.averageResponseTime =
                (this.usage.averageResponseTime * (this.usage.totalCalls - 1) + responseTime) / this.usage.totalCalls;
        }
        else {
            this.usage.errors++;
        }
    }
    getUsage() {
        return Object.assign({}, this.usage);
    }
}
const claudeRateLimiter = new ClaudeRateLimiter();
// Helper function to get configuration from database
function getConfig(key) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const config = yield prisma.systemConfig.findUnique({
                where: { key }
            });
            return (config === null || config === void 0 ? void 0 : config.value) || null;
        }
        catch (error) {
            console.error(`Error getting config ${key}:`, error);
            return null;
        }
    });
}
// Helper function to decrypt sensitive values
function decryptValue(encryptedValue) {
    try {
        // If it looks like an API key that was stored directly, return it
        if (encryptedValue.startsWith('sk-ant-')) {
            return encryptedValue;
        }
        const crypto = require('crypto');
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const parts = encryptedValue.split(':');
        if (parts.length !== 2) {
            // If not properly formatted for decryption, return as-is
            return encryptedValue;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        // If decryption fails and it looks like an API key, return it directly
        if (encryptedValue.startsWith('sk-ant-')) {
            return encryptedValue;
        }
        return '[ENCRYPTED]';
    }
}
// Helper function to decrypt configuration if needed
function getDecryptedConfig(key) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const config = yield prisma.systemConfig.findUnique({
                where: { key }
            });
            if (!config)
                return null;
            if (config.isEncrypted) {
                return decryptValue(config.value);
            }
            return config.value;
        }
        catch (error) {
            console.error(`Error getting decrypted config ${key}:`, error);
            return null;
        }
    });
}
// Helper function to save Claude usage statistics
function saveClaudeUsage(usage) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.claudeUsage.upsert({
                where: { id: 'claude_usage_stats' },
                update: {
                    totalCalls: usage.totalCalls,
                    totalTokens: usage.totalTokens,
                    averageResponseTime: usage.averageResponseTime,
                    errors: usage.errors,
                    lastCall: usage.lastCall,
                    updatedAt: new Date()
                },
                create: {
                    id: 'claude_usage_stats',
                    totalCalls: usage.totalCalls,
                    totalTokens: usage.totalTokens,
                    averageResponseTime: usage.averageResponseTime,
                    errors: usage.errors,
                    lastCall: usage.lastCall,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }
        catch (error) {
            console.error('Error saving Claude usage:', error);
        }
    });
}
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
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
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
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
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
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
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
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
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
            var _a, _b;
            const startTime = Date.now();
            // Check rate limiting
            const canProceed = yield claudeRateLimiter.checkRateLimit();
            if (!canProceed) {
                throw new Error('Rate limit exceeded. Please wait before making another request.');
            }
            // Try multiple possible key names
            let CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY || CLAUDE_API_KEY === '[ENCRYPTED]') {
                CLAUDE_API_KEY = yield getDecryptedConfig('Claude_API_Key');
            }
            if (!CLAUDE_API_KEY || CLAUDE_API_KEY === '[ENCRYPTED]') {
                throw new Error('Claude API key not configured or encrypted. Please configure a valid API key.');
            }
            // Get model configuration from database
            const model = (yield getConfig('CLAUDE_MODEL')) || 'claude-3-sonnet-20240229';
            const maxTokens = (yield getConfig('CLAUDE_MAX_TOKENS')) || '4000';
            try {
                console.log(`[Claude API] Making request to model: ${model}`);
                const response = yield fetch(CLAUDE_API_URL, {
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
                const responseTime = Date.now() - startTime;
                if (!response.ok) {
                    const errorText = yield response.text();
                    console.error(`[Claude API] Error ${response.status}: ${errorText}`);
                    // Record failed call
                    claudeRateLimiter.recordCall(0, responseTime, false);
                    yield saveClaudeUsage(claudeRateLimiter.getUsage());
                    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
                }
                const result = yield response.json();
                // Record successful call
                const totalTokens = (((_a = result.usage) === null || _a === void 0 ? void 0 : _a.input_tokens) || 0) + (((_b = result.usage) === null || _b === void 0 ? void 0 : _b.output_tokens) || 0);
                claudeRateLimiter.recordCall(totalTokens, responseTime, true);
                yield saveClaudeUsage(claudeRateLimiter.getUsage());
                console.log(`[Claude API] Success - Tokens: ${totalTokens}, Time: ${responseTime}ms`);
                return result;
            }
            catch (error) {
                const responseTime = Date.now() - startTime;
                claudeRateLimiter.recordCall(0, responseTime, false);
                yield saveClaudeUsage(claudeRateLimiter.getUsage());
                console.error('[Claude API] Request failed:', error);
                throw error;
            }
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
                // For now, use a simplified approach since PolynomialRegression expects 1D arrays
                // In a real implementation, you'd use a more sophisticated ML library
                const regression = {
                    predict: (feature) => {
                        // Simple linear combination of features
                        const weights = [0.3, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0.02, 0.02, 0.01];
                        return feature.reduce((sum, val, i) => sum + (val * (weights[i] || 0)), 0);
                    }
                };
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
    /**
     * Test Claude API connection
     */
    testClaudeConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const startTime = Date.now();
                // Test with a simple prompt
                const testPrompt = 'Hello, this is a test message. Please respond with "Connection successful." and your model name.';
                const response = yield this.callClaudeAPI(testPrompt);
                const responseTime = Date.now() - startTime;
                const model = (yield getConfig('CLAUDE_MODEL')) || 'claude-3-sonnet-20240229';
                return {
                    success: true,
                    message: 'Claude API connection successful',
                    model,
                    responseTime,
                    details: {
                        response: (_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text,
                        tokens: response.usage
                    }
                };
            }
            catch (error) {
                console.error('[Claude Test] Connection failed:', error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    model: (yield getConfig('CLAUDE_MODEL')) || 'claude-3-sonnet-20240229',
                    responseTime: 0,
                    details: {
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }
                };
            }
        });
    }
    /**
     * Get Claude API usage statistics
     */
    getClaudeUsageStats() {
        return __awaiter(this, void 0, void 0, function* () {
            // This would typically query a usage tracking table
            // For now, return mock statistics
            return {
                totalCalls: 150,
                totalTokens: 45000,
                averageResponseTime: 1200, // milliseconds
                costEstimate: 12.50, // USD
                lastCall: new Date()
            };
        });
    }
    // ============================================
    // AI MARKET DISCOVERY & ANALYSIS METHODS
    // ============================================
    /**
     * Analyze industry landscape for market discovery
     */
    analyzeIndustryLandscape(industry, criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildIndustryAnalysisPrompt(industry, criteria);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseIndustryAnalysisResponse(response);
            }
            catch (error) {
                console.error('Error analyzing industry landscape:', error);
                throw error;
            }
        });
    }
    /**
     * Discover products for a specific sub-industry
     */
    discoverIndustryProducts(industry, subIndustry) {
        return __awaiter(this, void 0, void 0, function* () {
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildProductDiscoveryPrompt(industry, subIndustry);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseProductDiscoveryResponse(response);
            }
            catch (error) {
                console.error('Error discovering products:', error);
                throw error;
            }
        });
    }
    /**
     * Generate comprehensive buyer profile
     */
    generateBuyerProfile(product, industry, subIndustry) {
        return __awaiter(this, void 0, void 0, function* () {
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildBuyerProfilePrompt(product, industry, subIndustry);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseBuyerProfileResponse(response);
            }
            catch (error) {
                console.error('Error generating buyer profile:', error);
                throw error;
            }
        });
    }
    /**
     * Generate optimal search strategy for discovery
     */
    generateSearchStrategy(buyerProfile, product, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildSearchStrategyPrompt(buyerProfile, product, industry);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseSearchStrategyResponse(response);
            }
            catch (error) {
                console.error('Error generating search strategy:', error);
                throw error;
            }
        });
    }
    /**
     * Analyze discovered prospect content for qualification
     */
    analyzeProspectContent(content, buyerProfile, product) {
        return __awaiter(this, void 0, void 0, function* () {
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildProspectAnalysisPrompt(content, buyerProfile, product);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseProspectAnalysisResponse(response);
            }
            catch (error) {
                console.error('Error analyzing prospect content:', error);
                throw error;
            }
        });
    }
    // ============================================
    // PROMPT BUILDING METHODS FOR MARKET DISCOVERY
    // ============================================
    buildIndustryAnalysisPrompt(industry, criteria) {
        return `As an expert market analyst, analyze the ${industry} industry and provide a comprehensive breakdown.

Industry: ${industry}
Analysis Criteria: ${criteria ? JSON.stringify(criteria) : 'General analysis'}

Please provide a detailed analysis in the following JSON format:
{
  "subIndustries": [
    {
      "name": "Sub-industry name",
      "marketSize": estimated_number_of_businesses,
      "description": "Brief description",
      "keyCharacteristics": ["characteristic1", "characteristic2"]
    }
  ],
  "marketTrends": ["trend1", "trend2", "trend3"],
  "opportunities": ["opportunity1", "opportunity2"],
  "challenges": ["challenge1", "challenge2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Focus on:
1. Breaking down the industry into meaningful sub-segments
2. Identifying market opportunities and trends
3. Understanding competitive dynamics
4. Providing actionable insights for business development

Ensure all numbers are realistic and based on current market data.`;
    }
    buildProductDiscoveryPrompt(industry, subIndustry) {
        return `As a B2B product specialist, identify high-opportunity products and services sold to the ${subIndustry} sector within the ${industry} industry.

Industry: ${industry}
Sub-Industry: ${subIndustry}

Please provide a comprehensive analysis in the following JSON format:
{
  "products": [
    {
      "name": "Product name",
      "category": "Product category",
      "description": "Detailed description",
      "targetMarket": "Who buys this",
      "priceRange": {"min": price_min, "max": price_max},
      "marketSize": estimated_market_size_usd,
      "keyVendors": ["vendor1", "vendor2"],
      "buyingPattern": "How often they buy"
    }
  ],
  "marketInsights": {
    "totalMarketSize": total_market_size_usd,
    "growthRate": annual_growth_percentage,
    "competitionLevel": "low/medium/high",
    "keyTrends": ["trend1", "trend2"]
  }
}

Focus on:
1. Products/services with recurring revenue potential
2. High-value B2B solutions (>$5,000 typical purchase)
3. Products that require professional installation/service
4. Solutions that solve critical business problems
5. Current market trends and growth opportunities

Prioritize products with strong market demand and reasonable competition levels.`;
    }
    buildBuyerProfilePrompt(product, industry, subIndustry) {
        return `As a buyer persona expert, create a comprehensive profile of companies that would purchase ${product} in the ${subIndustry} sector of the ${industry} industry.

Product: ${product}
Industry: ${industry}
Sub-Industry: ${subIndustry}

Please provide a detailed buyer profile in the following JSON format:
{
  "demographics": {
    "companySize": {"min": employee_count_min, "max": employee_count_max},
    "annualRevenue": {"min": revenue_min, "max": revenue_max},
    "geography": ["geographic regions"],
    "businessAge": {"min": years_min, "max": years_max}
  },
  "firmographics": {
    "businessModel": ["model1", "model2"],
    "primaryServices": ["service1", "service2"],
    "customerBase": ["customer_type1", "customer_type2"],
    "operationalScale": "description"
  },
  "psychographics": {
    "painPoints": ["pain1", "pain2"],
    "motivations": ["motivation1", "motivation2"],
    "values": ["value1", "value2"],
    "riskTolerance": "low/medium/high"
  },
  "behavioral": {
    "informationSources": ["source1", "source2"],
    "decisionMakingStyle": "description",
    "buyingFrequency": "how often",
    "preferredChannels": ["channel1", "channel2"]
  },
  "technographics": {
    "currentTech": ["tech1", "tech2"],
    "digitalAdoption": "early/mainstream/laggard",
    "integrationNeeds": ["need1", "need2"]
  },
  "decisionProcess": {
    "timeline": "typical buying timeline",
    "stakeholders": ["stakeholder1", "stakeholder2"],
    "criteria": ["criteria1", "criteria2"],
    "painPoints": ["process_pain1", "process_pain2"]
  }
}

Focus on creating an actionable profile that can be used for:
1. Targeted prospect discovery
2. Sales messaging and positioning
3. Marketing channel selection
4. Content strategy development`;
    }
    buildSearchStrategyPrompt(buyerProfile, product, industry) {
        return `As a digital marketing strategist, create an optimal search and discovery strategy to find companies that match this buyer profile and would be interested in ${product}.

Buyer Profile: ${JSON.stringify(buyerProfile)}
Product: ${product}
Industry: ${industry}

Please provide a comprehensive search strategy in the following JSON format:
{
  "keywords": {
    "primary": ["keyword1", "keyword2"],
    "secondary": ["secondary1", "secondary2"],
    "negative": ["exclude1", "exclude2"],
    "longTail": ["long tail phrase1", "long tail phrase2"]
  },
  "targeting": {
    "geoTargeting": ["location1", "location2"],
    "industryFilters": ["filter1", "filter2"],
    "sizeFilters": {"employees": {"min": min_count, "max": max_count}},
    "excludeTerms": ["exclude1", "exclude2"]
  },
  "sources": {
    "searchEngines": ["google", "bing"],
    "directories": ["directory1", "directory2"],
    "socialPlatforms": ["linkedin", "twitter"],
    "tradeSources": ["source1", "source2"]
  },
  "contentFilters": {
    "qualityIndicators": ["indicator1", "indicator2"],
    "businessSignals": ["signal1", "signal2"],
    "contactRequirements": ["requirement1", "requirement2"]
  }
}

Focus on:
1. Keywords that identify the target companies (not just the product)
2. Negative keywords to filter out irrelevant results
3. Multiple discovery channels for comprehensive coverage
4. Quality filters to ensure high-value prospects
5. Geographic and demographic targeting based on buyer profile`;
    }
    buildProspectAnalysisPrompt(content, buyerProfile, product) {
        return `As an AI prospect analyst, evaluate this company's website content to determine if they are a qualified prospect for ${product}.

Website Content:
${content}

Target Buyer Profile:
${JSON.stringify(buyerProfile)}

Product: ${product}

Please analyze and score this prospect in the following JSON format:
{
  "relevanceScore": score_0_to_100,
  "qualityScore": score_0_to_100,
  "confidenceScore": score_0_to_100,
  "companyProfile": {
    "name": "extracted_company_name",
    "size": "small/medium/large",
    "industry": "detected_industry",
    "services": ["service1", "service2"],
    "technologies": ["tech1", "tech2"]
  },
  "buyingSignals": ["signal1", "signal2"],
  "disqualifiers": ["issue1", "issue2"],
  "nextSteps": ["action1", "action2"],
  "reasoning": "explanation of scoring"
}

Scoring Criteria:
- Relevance Score (0-100): How well they match the buyer profile
- Quality Score (0-100): Overall prospect quality based on content richness, professionalism, contact info
- Confidence Score (0-100): How confident you are in your analysis based on available information

Consider:
1. Industry and service alignment
2. Company size indicators
3. Technology adoption signals
4. Professional presentation
5. Contact information availability
6. Growth/expansion indicators
7. Budget/investment capacity signals

Be thorough but realistic in your assessment.`;
    }
    // ============================================
    // RESPONSE PARSING METHODS FOR MARKET DISCOVERY
    // ============================================
    parseIndustryAnalysisResponse(response) {
        try {
            const content = response.content[0].text;
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback: create structured response from text
            return {
                subIndustries: [],
                marketTrends: [],
                opportunities: [],
                challenges: [],
                recommendations: [],
                rawResponse: content
            };
        }
        catch (error) {
            console.error('Error parsing industry analysis response:', error);
            throw new Error('Failed to parse Claude industry analysis response');
        }
    }
    parseProductDiscoveryResponse(response) {
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                products: [],
                marketInsights: {
                    totalMarketSize: 0,
                    growthRate: 0,
                    competitionLevel: 'unknown',
                    keyTrends: []
                },
                rawResponse: content
            };
        }
        catch (error) {
            console.error('Error parsing product discovery response:', error);
            throw new Error('Failed to parse Claude product discovery response');
        }
    }
    parseBuyerProfileResponse(response) {
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                demographics: {},
                firmographics: {},
                psychographics: {},
                behavioral: {},
                technographics: {},
                decisionProcess: {},
                rawResponse: content
            };
        }
        catch (error) {
            console.error('Error parsing buyer profile response:', error);
            throw new Error('Failed to parse Claude buyer profile response');
        }
    }
    parseSearchStrategyResponse(response) {
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                keywords: { primary: [], secondary: [], negative: [], longTail: [] },
                targeting: { geoTargeting: [], industryFilters: [], sizeFilters: {}, excludeTerms: [] },
                sources: { searchEngines: [], directories: [], socialPlatforms: [], tradeSources: [] },
                contentFilters: { qualityIndicators: [], businessSignals: [], contactRequirements: [] },
                rawResponse: content
            };
        }
        catch (error) {
            console.error('Error parsing search strategy response:', error);
            throw new Error('Failed to parse Claude search strategy response');
        }
    }
    parseProspectAnalysisResponse(response) {
        try {
            const content = response.content[0].text;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                relevanceScore: 0,
                qualityScore: 0,
                confidenceScore: 0,
                companyProfile: {},
                buyingSignals: [],
                disqualifiers: [],
                nextSteps: [],
                reasoning: content
            };
        }
        catch (error) {
            console.error('Error parsing prospect analysis response:', error);
            throw new Error('Failed to parse Claude prospect analysis response');
        }
    }
    /**
     * Compare Claude vs ML model predictions
     */
    compareClaudeVsML(leadId, modelIds) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get lead data
            const lead = yield prisma.lead.findUnique({
                where: { id: leadId },
                include: { enrichment: true }
            });
            if (!lead) {
                throw new Error('Lead not found');
            }
            // Get Claude prediction
            const claudePrediction = yield this.scoreLeadWithClaude(lead, lead.industry);
            // Get ML predictions
            const mlPredictions = [];
            if (modelIds && modelIds.length > 0) {
                for (const modelId of modelIds) {
                    try {
                        const prediction = yield this.predictScore(leadId);
                        mlPredictions.push({
                            modelId,
                            modelName: `ML Model ${modelId}`,
                            prediction
                        });
                    }
                    catch (error) {
                        console.error(`Error getting prediction for model ${modelId}:`, error);
                    }
                }
            }
            // Calculate comparison metrics
            const avgMLScore = mlPredictions.length > 0
                ? mlPredictions.reduce((sum, p) => sum + p.prediction.score, 0) / mlPredictions.length
                : 0;
            const scoreDifference = claudePrediction.score - avgMLScore;
            const confidenceDifference = claudePrediction.confidence - (mlPredictions.length > 0
                ? mlPredictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / mlPredictions.length
                : 0);
            // Determine agreement level
            let agreement = 'medium';
            if (Math.abs(scoreDifference) < 0.1)
                agreement = 'high';
            else if (Math.abs(scoreDifference) > 0.3)
                agreement = 'low';
            return {
                claudePrediction,
                mlPredictions,
                comparison: {
                    scoreDifference,
                    confidenceDifference,
                    agreement,
                    recommendations: [
                        agreement === 'high' ? 'Models are in good agreement' : 'Consider reviewing scoring criteria',
                        scoreDifference > 0 ? 'Claude suggests higher potential' : 'ML models suggest higher potential',
                        'Use ensemble approach for best results'
                    ]
                }
            };
        });
    }
    /**
     * Perform enhanced content analysis with multiple perspectives
     */
    performEnhancedAnalysis(content_1) {
        return __awaiter(this, arguments, void 0, function* (content, industry = 'dental', analysisType = 'comprehensive') {
            const CLAUDE_API_KEY = yield getDecryptedConfig('CLAUDE_API_KEY');
            if (!CLAUDE_API_KEY) {
                throw new Error('Claude API key not configured');
            }
            try {
                const prompt = this.buildEnhancedAnalysisPrompt(content, industry, analysisType);
                const response = yield this.callClaudeAPI(prompt);
                return this.parseEnhancedAnalysisResponse(response);
            }
            catch (error) {
                console.error('Error performing enhanced analysis:', error);
                throw error;
            }
        });
    }
    /**
     * Build enhanced analysis prompt
     */
    buildEnhancedAnalysisPrompt(content, industry, analysisType) {
        return `Please perform a comprehensive analysis of the following content for the ${industry} industry.

Content: ${content}

Analysis Type: ${analysisType}

Please provide a detailed analysis including:
1. Sentiment analysis (positive/negative/neutral)
2. Key keywords and topics
3. Industry relevance score (0-100)
4. Technical analysis (technologies, complexity, sophistication)
5. Business analysis (market position, growth potential, competitive advantages, risks)
6. Actionable insights and recommendations

Format your response as a JSON object with the following structure:
{
  "sentiment": "positive|negative|neutral",
  "keywords": ["keyword1", "keyword2"],
  "topics": ["topic1", "topic2"],
  "industryRelevance": 85,
  "insights": ["insight1", "insight2"],
  "technicalAnalysis": {
    "technologies": ["tech1", "tech2"],
    "complexity": "low|medium|high",
    "sophistication": 75
  },
  "businessAnalysis": {
    "marketPosition": "description",
    "growthPotential": 80,
    "competitiveAdvantages": ["advantage1", "advantage2"],
    "risks": ["risk1", "risk2"]
  },
  "recommendations": ["recommendation1", "recommendation2"]
}`;
    }
    /**
     * Parse enhanced analysis response
     */
    parseEnhancedAnalysisResponse(response) {
        var _a;
        try {
            const content = (_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text;
            if (!content) {
                throw new Error('Invalid response format from Claude');
            }
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
        }
        catch (error) {
            console.error('Error parsing enhanced analysis response:', error);
            throw new Error('Failed to parse Claude API response');
        }
    }
}
exports.AIScoringService = AIScoringService;
exports.aiScoringService = new AIScoringService();
