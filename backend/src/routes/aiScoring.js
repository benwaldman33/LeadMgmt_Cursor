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
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../middleware/auditLog");
const aiScoringService_1 = require("../services/aiScoringService");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper function to encrypt sensitive values
const encryptValue = (value) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};
// Helper function to decrypt sensitive values
const decryptValue = (encryptedValue) => {
    const algorithm = 'aes-256-cbc';
    const key = crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const parts = encryptedValue.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
// Helper functions from aiScoringService
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
const router = express_1.default.Router();
const aiScoringService = new aiScoringService_1.AIScoringService();
// Validation schemas
const predictionRequestSchema = joi_1.default.object({
    leadId: joi_1.default.string().required(),
});
const modelCreateSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    type: joi_1.default.string().valid('regression', 'classification', 'ensemble').required(),
    features: joi_1.default.array().items(joi_1.default.string()).required(),
});
const modelUpdateSchema = joi_1.default.object({
    isActive: joi_1.default.boolean().optional(),
});
const textAnalysisSchema = joi_1.default.object({
    text: joi_1.default.string().required(),
});
// Get AI prediction for a lead
router.post('/predict', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'AI_PREDICT', entityType: 'LEAD' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = predictionRequestSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const { leadId } = value;
        const prediction = yield aiScoringService.predictScore(leadId);
        res.json({
            success: true,
            data: prediction,
        });
    }
    catch (error) {
        console.error('Error predicting score:', error);
        res.status(500).json({ error: 'Failed to predict score' });
    }
}));
// Get all active AI models
router.get('/models', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const models = yield aiScoringService.getActiveModels();
        res.json({
            success: true,
            data: models,
        });
    }
    catch (error) {
        console.error('Error getting models:', error);
        res.status(500).json({ error: 'Failed to get models' });
    }
}));
// Create a new AI model
router.post('/models', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'AI_MODEL_CREATE', entityType: 'AI_MODEL' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = modelCreateSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const model = yield aiScoringService.createModel(value);
        res.json({
            success: true,
            data: model,
        });
    }
    catch (error) {
        console.error('Error creating model:', error);
        res.status(500).json({ error: 'Failed to create model' });
    }
}));
// Update model status
router.patch('/models/:modelId', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'AI_MODEL_UPDATE', entityType: 'AI_MODEL' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { modelId } = req.params;
        const { error, value } = modelUpdateSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        if (value.isActive !== undefined) {
            yield aiScoringService.updateModelStatus(modelId, value.isActive);
        }
        res.json({
            success: true,
            message: 'Model updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating model:', error);
        res.status(500).json({ error: 'Failed to update model' });
    }
}));
// Get model performance
router.get('/models/:modelId/performance', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { modelId } = req.params;
        const performance = yield aiScoringService.getModelPerformance(modelId);
        if (!performance) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json({
            success: true,
            data: performance,
        });
    }
    catch (error) {
        console.error('Error getting model performance:', error);
        res.status(500).json({ error: 'Failed to get model performance' });
    }
}));
// Train a model
router.post('/models/:modelId/train', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'AI_MODEL_TRAIN', entityType: 'AI_MODEL' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { modelId } = req.params;
        const { trainingData } = req.body;
        if (!Array.isArray(trainingData) || trainingData.length === 0) {
            return res.status(400).json({ error: 'Training data is required' });
        }
        const performance = yield aiScoringService.trainModel(modelId, trainingData);
        res.json({
            success: true,
            data: performance,
            message: 'Model trained successfully',
        });
    }
    catch (error) {
        console.error('Error training model:', error);
        res.status(500).json({ error: 'Failed to train model' });
    }
}));
// Analyze text content
router.post('/analyze-text', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'AI_TEXT_ANALYSIS', entityType: 'TEXT' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = textAnalysisSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const analysis = yield aiScoringService.analyzeText(value.text);
        res.json({
            success: true,
            data: analysis,
        });
    }
    catch (error) {
        console.error('Error analyzing text:', error);
        res.status(500).json({ error: 'Failed to analyze text' });
    }
}));
// Get AI insights for dashboard
router.get('/insights', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const models = yield aiScoringService.getActiveModels();
        // Calculate insights
        const totalModels = models.length;
        const activeModels = models.filter(m => m.isActive).length;
        const avgAccuracy = models.length > 0
            ? models.reduce((sum, m) => { var _a; return sum + (((_a = m.performance) === null || _a === void 0 ? void 0 : _a.accuracy) || 0); }, 0) / models.length
            : 0;
        const insights = {
            totalModels,
            activeModels,
            avgAccuracy: Math.round(avgAccuracy * 100) / 100,
            modelTypes: models.reduce((acc, m) => {
                acc[m.type] = (acc[m.type] || 0) + 1;
                return acc;
            }, {}),
            recentActivity: models
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
                .map(m => {
                var _a;
                return ({
                    id: m.id,
                    name: m.name,
                    type: m.type,
                    accuracy: ((_a = m.performance) === null || _a === void 0 ? void 0 : _a.accuracy) || 0,
                    updatedAt: m.updatedAt
                });
            })
        };
        res.json({
            success: true,
            data: insights,
        });
    }
    catch (error) {
        console.error('Error getting AI insights:', error);
        res.status(500).json({ error: 'Failed to get AI insights' });
    }
}));
// Bulk predict scores for multiple leads
router.post('/bulk-predict', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'AI_BULK_PREDICT', entityType: 'LEAD' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadIds } = req.body;
        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'Lead IDs array is required' });
        }
        const predictions = [];
        const errors = [];
        for (const leadId of leadIds) {
            try {
                const prediction = yield aiScoringService.predictScore(leadId);
                predictions.push({ leadId, prediction });
            }
            catch (error) {
                errors.push({ leadId, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
        res.json({
            success: true,
            data: {
                predictions,
                errors,
                summary: {
                    total: leadIds.length,
                    successful: predictions.length,
                    failed: errors.length
                }
            },
        });
    }
    catch (error) {
        console.error('Error bulk predicting scores:', error);
        res.status(500).json({ error: 'Failed to bulk predict scores' });
    }
}));
// Claude AI specific routes
// Get Claude configuration
router.get('/claude/config', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const apiKey = yield getDecryptedConfig('CLAUDE_API_KEY');
        const config = {
            apiKey: apiKey ? '[ENCRYPTED]' : undefined,
            model: (yield getConfig('CLAUDE_MODEL')) || 'claude-3-sonnet-20240229',
            maxTokens: (yield getConfig('CLAUDE_MAX_TOKENS')) || '4000',
            temperature: (yield getConfig('CLAUDE_TEMPERATURE')) || '0.7',
            isConfigured: !!apiKey
        };
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        console.error('Error getting Claude config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Claude configuration'
        });
    }
}));
// Update Claude configuration
router.post('/claude/config', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'CLAUDE_CONFIG_UPDATE', entityType: 'SYSTEM_CONFIG' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { apiKey, model, maxTokens, temperature } = req.body;
        // Update configuration in database
        const updates = [];
        if (apiKey)
            updates.push(prisma.systemConfig.upsert({
                where: { key: 'CLAUDE_API_KEY' },
                update: {
                    value: encryptValue(apiKey),
                    updatedAt: new Date()
                },
                create: {
                    key: 'CLAUDE_API_KEY',
                    value: encryptValue(apiKey),
                    description: 'Claude API Key for AI scoring',
                    category: 'AI_SCORING',
                    isEncrypted: true,
                    createdById: req.user.id
                }
            }));
        if (model)
            updates.push(prisma.systemConfig.upsert({
                where: { key: 'CLAUDE_MODEL' },
                update: { value: model },
                create: {
                    key: 'CLAUDE_MODEL',
                    value: model,
                    description: 'Claude model to use for AI scoring',
                    category: 'AI_SCORING',
                    createdById: req.user.id
                }
            }));
        if (maxTokens)
            updates.push(prisma.systemConfig.upsert({
                where: { key: 'CLAUDE_MAX_TOKENS' },
                update: { value: maxTokens.toString() },
                create: {
                    key: 'CLAUDE_MAX_TOKENS',
                    value: maxTokens.toString(),
                    description: 'Maximum tokens for Claude API calls',
                    category: 'AI_SCORING',
                    createdById: req.user.id
                }
            }));
        if (temperature !== undefined)
            updates.push(prisma.systemConfig.upsert({
                where: { key: 'CLAUDE_TEMPERATURE' },
                update: { value: temperature.toString() },
                create: {
                    key: 'CLAUDE_TEMPERATURE',
                    value: temperature.toString(),
                    description: 'Temperature setting for Claude API calls',
                    category: 'AI_SCORING',
                    createdById: req.user.id
                }
            }));
        yield Promise.all(updates);
        res.json({
            success: true,
            message: 'Claude configuration updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating Claude config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update Claude configuration'
        });
    }
}));
// Test Claude API connection
router.post('/claude/test-connection', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const testResult = yield aiScoringService.testClaudeConnection();
        res.json({
            success: true,
            data: testResult
        });
    }
    catch (error) {
        console.error('Error testing Claude connection:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to test Claude connection'
        });
    }
}));
// Get Claude API usage statistics
router.get('/claude/usage', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const usage = yield aiScoringService.getClaudeUsageStats();
        res.json({
            success: true,
            data: usage
        });
    }
    catch (error) {
        console.error('Error getting Claude usage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Claude usage statistics'
        });
    }
}));
// Compare Claude vs ML model predictions
router.post('/claude/compare-predictions', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'CLAUDE_COMPARE_PREDICTIONS', entityType: 'LEAD' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadId, modelIds } = req.body;
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'Lead ID is required'
            });
        }
        const comparison = yield aiScoringService.compareClaudeVsML(leadId, modelIds);
        res.json({
            success: true,
            data: comparison
        });
    }
    catch (error) {
        console.error('Error comparing predictions:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to compare predictions'
        });
    }
}));
// Enhanced content analysis with multiple perspectives
router.post('/claude/enhanced-analysis', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'CLAUDE_ENHANCED_ANALYSIS', entityType: 'LEAD' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, industry = 'dental', analysisType = 'comprehensive' } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }
        const analysis = yield aiScoringService.performEnhancedAnalysis(content, industry, analysisType);
        res.json({
            success: true,
            data: analysis
        });
    }
    catch (error) {
        console.error('Error performing enhanced analysis:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to perform enhanced analysis'
        });
    }
}));
// Score lead with Claude AI
router.post('/claude/score-lead', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadData, industry = 'dental' } = req.body;
        if (!leadData) {
            return res.status(400).json({
                success: false,
                error: 'Lead data is required'
            });
        }
        const result = yield aiScoringService.scoreLeadWithClaude(leadData, industry);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error scoring lead with Claude:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to score lead'
        });
    }
}));
// Get criteria suggestions for industry
router.get('/claude/criteria-suggestions/:industry', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { industry } = req.params;
        const result = yield aiScoringService.getCriteriaSuggestions(industry);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error getting criteria suggestions:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get criteria suggestions'
        });
    }
}));
// Get weight optimization recommendations
router.post('/claude/weight-optimization', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentWeights, performanceData } = req.body;
        if (!currentWeights || !performanceData) {
            return res.status(400).json({
                success: false,
                error: 'Current weights and performance data are required'
            });
        }
        const result = yield aiScoringService.getWeightOptimizationRecommendations(currentWeights, performanceData);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error getting weight optimization:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get weight optimization'
        });
    }
}));
// Analyze lead content
router.post('/claude/analyze-content', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, industry = 'dental' } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }
        const result = yield aiScoringService.analyzeLeadContent(content, industry);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error analyzing content:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze content'
        });
    }
}));
console.log('aiScoring router defined:', typeof router);
exports.default = router;
