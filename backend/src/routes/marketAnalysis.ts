import express from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { marketAnalysisService, MarketCriteria } from '../services/marketAnalysisService';
import { discoveryExecutionService } from '../services/discoveryExecutionService';

const router = express.Router();

// Validation schemas
const marketCriteriaSchema = Joi.object({
  minLocations: Joi.number().min(1000).optional(),
  maxLocations: Joi.number().optional(),
  geography: Joi.string().valid('US', 'CA', 'Global').default('US'),
  industries: Joi.array().items(Joi.string()).optional(),
  excludeIndustries: Joi.array().items(Joi.string()).optional(),
  filters: Joi.object({
    growthRate: Joi.object({
      min: Joi.number(),
      max: Joi.number()
    }).optional(),
    avgRevenue: Joi.object({
      min: Joi.number(),
      max: Joi.number()
    }).optional(),
    competitionLevel: Joi.string().valid('low', 'medium', 'high').optional()
  }).optional()
});

const industryAnalysisSchema = Joi.object({
  industry: Joi.string().required()
});

const productDiscoverySchema = Joi.object({
  industry: Joi.string().required(),
  subIndustry: Joi.string().required()
});

const buyerProfileSchema = Joi.object({
  product: Joi.string().required(),
  industry: Joi.string().required(),
  subIndustry: Joi.string().required()
});

// Market Size Analysis
router.post('/analyze-market-size',
  authenticateToken,
  auditLog({ action: 'MARKET_ANALYSIS', entityType: 'MARKET_ANALYSIS' }),
  async (req, res) => {
    try {
      const { error, value } = marketCriteriaSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      const userId = req.user!.id;
      const result = await marketAnalysisService.analyzeMarketSize(value as MarketCriteria, userId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error analyzing market size:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze market size'
      });
    }
  }
);

// Get Sub-Industries
router.post('/sub-industries',
  authenticateToken,
  auditLog({ action: 'SUB_INDUSTRY_ANALYSIS', entityType: 'INDUSTRY' }),
  async (req, res) => {
    try {
      const { error, value } = industryAnalysisSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      const userId = req.user!.id;
      const { industry } = value;
      const subIndustries = await marketAnalysisService.getSubIndustries(industry, userId);

      res.json({
        success: true,
        data: {
          industry,
          subIndustries,
          count: subIndustries.length
        }
      });

    } catch (error) {
      console.error('Error getting sub-industries:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sub-industries'
      });
    }
  }
);

// Product Discovery
router.post('/discover-products',
  authenticateToken,
  auditLog({ action: 'PRODUCT_DISCOVERY', entityType: 'PRODUCT' }),
  async (req, res) => {
    try {
      const { error, value } = productDiscoverySchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      const userId = req.user!.id;
      const { industry, subIndustry } = value;
      const result = await marketAnalysisService.discoverProducts(industry, subIndustry, userId);

      res.json({
        success: true,
        data: {
          industry,
          subIndustry,
          ...result
        }
      });

    } catch (error) {
      console.error('Error discovering products:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discover products'
      });
    }
  }
);

// Generate Buyer Profile
router.post('/buyer-profile',
  authenticateToken,
  auditLog({ action: 'BUYER_PROFILE_GENERATION', entityType: 'BUYER_PROFILE' }),
  async (req, res) => {
    try {
      const { error, value } = buyerProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      const userId = req.user!.id;
      const { product, industry, subIndustry } = value;
      const buyerProfile = await marketAnalysisService.generateBuyerProfile(product, industry, subIndustry, userId);

      res.json({
        success: true,
        data: {
          product,
          industry,
          subIndustry,
          buyerProfile
        }
      });

    } catch (error) {
      console.error('Error generating buyer profile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate buyer profile'
      });
    }
  }
);

// Create Search Strategy
router.post('/search-strategy',
  authenticateToken,
  auditLog({ action: 'SEARCH_STRATEGY_CREATION', entityType: 'SEARCH_STRATEGY' }),
  async (req, res) => {
    try {
      const { buyerProfile, product, industry } = req.body;

      if (!buyerProfile || !product || !industry) {
        return res.status(400).json({
          success: false,
          error: 'Buyer profile, product, and industry are required'
        });
      }

      const searchStrategy = await marketAnalysisService.createSearchStrategy(buyerProfile, product, industry);

      res.json({
        success: true,
        data: {
          product,
          industry,
          searchStrategy
        }
      });

    } catch (error) {
      console.error('Error creating search strategy:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create search strategy'
      });
    }
  }
);

// Get Market Analysis by ID
router.get('/analysis/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Analysis ID is required'
        });
      }

      const analysis = await marketAnalysisService.getMarketAnalysisById(id);

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('Error getting market analysis:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get market analysis'
      });
    }
  }
);

// Get User's Market Analyses
router.get('/analyses',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const analyses = await marketAnalysisService.getUserMarketAnalyses(userId);

      res.json({
        success: true,
        data: {
          analyses,
          count: analyses.length
        }
      });

    } catch (error) {
      console.error('Error getting user market analyses:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get market analyses'
      });
    }
  }
);

// Quick Market Stats (for dashboard)
router.get('/stats',
  authenticateToken,
  async (req, res) => {
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

    } catch (error) {
      console.error('Error getting market stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get market stats'
      });
    }
  }
);

// Discovery Model Creation
router.post('/create-discovery-model',
  authenticateToken,
  auditLog({ action: 'DISCOVERY_MODEL_CREATED', entityType: 'DISCOVERY_MODEL' }),
  async (req, res) => {
    try {
      const { name, industry, subIndustry, product, buyerProfile, searchStrategy, marketSize } = req.body;
      const userId = req.user!.id;

      if (!name || !industry || !subIndustry || !product) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, industry, subIndustry, product'
        });
      }

      const discoveryModel = await discoveryExecutionService.createDiscoveryModel({
        name,
        industry,
        subIndustry,
        product,
        buyerProfile,
        searchStrategy,
        marketSize,
        userId
      });

      res.json({
        success: true,
        data: { discoveryModel }
      });

    } catch (error) {
      console.error('Error creating discovery model:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create discovery model'
      });
    }
  }
);

// Start Discovery Execution
router.post('/start-discovery-execution',
  authenticateToken,
  auditLog({ action: 'DISCOVERY_EXECUTION_STARTED', entityType: 'DISCOVERY_EXECUTION' }),
  async (req, res) => {
    try {
      const { discoveryModelId, config } = req.body;
      const userId = req.user!.id;

      if (!discoveryModelId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: discoveryModelId'
        });
      }

      const execution = await discoveryExecutionService.startDiscoveryExecution(
        discoveryModelId,
        userId,
        config || {}
      );

      res.json({
        success: true,
        data: { execution }
      });

    } catch (error) {
      console.error('Error starting discovery execution:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start discovery execution'
      });
    }
  }
);

// Get Discovery Execution Progress
router.get('/execution/:executionId/progress',
  authenticateToken,
  async (req, res) => {
    try {
      const { executionId } = req.params;
      const progress = await discoveryExecutionService.getExecutionProgress(executionId);

      if (!progress) {
        return res.status(404).json({
          success: false,
          error: 'Discovery execution not found'
        });
      }

      res.json({
        success: true,
        data: { progress }
      });

    } catch (error) {
      console.error('Error getting execution progress:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get execution progress'
      });
    }
  }
);

// Create Discovery Model and Start Execution (Combined endpoint)
router.post('/start-discovery',
  authenticateToken,
  auditLog({ action: 'DISCOVERY_STARTED', entityType: 'DISCOVERY_EXECUTION' }),
  async (req, res) => {
    try {
      const { name, industry, subIndustry, product, buyerProfile, searchStrategy, marketSize, config } = req.body;
      const userId = req.user!.id;

      if (!name || !industry || !subIndustry || !product) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, industry, subIndustry, product'
        });
      }

      // Create discovery model
      const discoveryModel = await discoveryExecutionService.createDiscoveryModel({
        name,
        industry,
        subIndustry,
        product,
        buyerProfile,
        searchStrategy,
        marketSize,
        userId
      });

      // Start execution
      const execution = await discoveryExecutionService.startDiscoveryExecution(
        discoveryModel.id,
        userId,
        config || {}
      );

      res.json({
        success: true,
        data: { 
          discoveryModel,
          execution
        }
      });

    } catch (error) {
      console.error('Error starting discovery:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start discovery'
      });
    }
  }
);

export default router;
