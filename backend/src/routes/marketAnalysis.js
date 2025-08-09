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
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../middleware/auditLog");
const marketAnalysisService_1 = require("../services/marketAnalysisService");
const router = express_1.default.Router();
// Validation schemas
const marketCriteriaSchema = joi_1.default.object({
    minLocations: joi_1.default.number().min(1000).optional(),
    maxLocations: joi_1.default.number().optional(),
    geography: joi_1.default.string().valid('US', 'CA', 'Global').default('US'),
    industries: joi_1.default.array().items(joi_1.default.string()).optional(),
    excludeIndustries: joi_1.default.array().items(joi_1.default.string()).optional(),
    filters: joi_1.default.object({
        growthRate: joi_1.default.object({
            min: joi_1.default.number(),
            max: joi_1.default.number()
        }).optional(),
        avgRevenue: joi_1.default.object({
            min: joi_1.default.number(),
            max: joi_1.default.number()
        }).optional(),
        competitionLevel: joi_1.default.string().valid('low', 'medium', 'high').optional()
    }).optional()
});
const industryAnalysisSchema = joi_1.default.object({
    industry: joi_1.default.string().required()
});
const productDiscoverySchema = joi_1.default.object({
    industry: joi_1.default.string().required(),
    subIndustry: joi_1.default.string().required()
});
const buyerProfileSchema = joi_1.default.object({
    product: joi_1.default.string().required(),
    industry: joi_1.default.string().required(),
    subIndustry: joi_1.default.string().required()
});
// Market Size Analysis
router.post('/analyze-market-size', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'MARKET_ANALYSIS', entityType: 'MARKET_ANALYSIS' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = marketCriteriaSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }
        const userId = req.user.id;
        const result = yield marketAnalysisService_1.marketAnalysisService.analyzeMarketSize(value, userId);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error analyzing market size:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze market size'
        });
    }
}));
// Get Sub-Industries
router.post('/sub-industries', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'SUB_INDUSTRY_ANALYSIS', entityType: 'INDUSTRY' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = industryAnalysisSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }
        const userId = req.user.id;
        const { industry } = value;
        const subIndustries = yield marketAnalysisService_1.marketAnalysisService.getSubIndustries(industry, userId);
        res.json({
            success: true,
            data: {
                industry,
                subIndustries,
                count: subIndustries.length
            }
        });
    }
    catch (error) {
        console.error('Error getting sub-industries:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get sub-industries'
        });
    }
}));
// Product Discovery
router.post('/discover-products', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'PRODUCT_DISCOVERY', entityType: 'PRODUCT' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = productDiscoverySchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }
        const userId = req.user.id;
        const { industry, subIndustry } = value;
        const result = yield marketAnalysisService_1.marketAnalysisService.discoverProducts(industry, subIndustry, userId);
        res.json({
            success: true,
            data: Object.assign({ industry,
                subIndustry }, result)
        });
    }
    catch (error) {
        console.error('Error discovering products:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to discover products'
        });
    }
}));
// Generate Buyer Profile
router.post('/buyer-profile', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'BUYER_PROFILE_GENERATION', entityType: 'BUYER_PROFILE' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = buyerProfileSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }
        const userId = req.user.id;
        const { product, industry, subIndustry } = value;
        const buyerProfile = yield marketAnalysisService_1.marketAnalysisService.generateBuyerProfile(product, industry, subIndustry, userId);
        res.json({
            success: true,
            data: {
                product,
                industry,
                subIndustry,
                buyerProfile
            }
        });
    }
    catch (error) {
        console.error('Error generating buyer profile:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate buyer profile'
        });
    }
}));
// Create Search Strategy
router.post('/search-strategy', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'SEARCH_STRATEGY_CREATION', entityType: 'SEARCH_STRATEGY' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { buyerProfile, product, industry } = req.body;
        if (!buyerProfile || !product || !industry) {
            return res.status(400).json({
                success: false,
                error: 'Buyer profile, product, and industry are required'
            });
        }
        const searchStrategy = yield marketAnalysisService_1.marketAnalysisService.createSearchStrategy(buyerProfile, product, industry);
        res.json({
            success: true,
            data: {
                product,
                industry,
                searchStrategy
            }
        });
    }
    catch (error) {
        console.error('Error creating search strategy:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create search strategy'
        });
    }
}));
// Get Market Analysis by ID
router.get('/analysis/:id', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Analysis ID is required'
            });
        }
        const analysis = yield marketAnalysisService_1.marketAnalysisService.getMarketAnalysisById(id);
        res.json({
            success: true,
            data: analysis
        });
    }
    catch (error) {
        console.error('Error getting market analysis:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get market analysis'
        });
    }
}));
// Get User's Market Analyses
router.get('/analyses', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const analyses = yield marketAnalysisService_1.marketAnalysisService.getUserMarketAnalyses(userId);
        res.json({
            success: true,
            data: {
                analyses,
                count: analyses.length
            }
        });
    }
    catch (error) {
        console.error('Error getting user market analyses:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get market analyses'
        });
    }
}));
// Quick Market Stats (for dashboard)
router.get('/stats', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // This would provide quick stats for the dashboard
        const stats = {
            totalIndustriesAnalyzed: 847,
            avgAnalysisTime: '2.3 minutes',
            topIndustries: [
                { name: 'Plumbing Contractors', locations: 412000 },
                { name: 'Full-Service Restaurants', locations: 653000 },
                { name: 'Auto Repair', locations: 347000 }
            ],
            recentAnalyses: 12,
            discoveryModelsCreated: 8
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting market stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get market stats'
        });
    }
}));
exports.default = router;
