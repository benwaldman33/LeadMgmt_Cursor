import express from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';
import { AIScoringService } from '../services/aiScoringService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper functions from aiScoringService
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

const router = express.Router();
const aiScoringService = new AIScoringService();

// Validation schemas
const predictionRequestSchema = Joi.object({
  leadId: Joi.string().required(),
});

const modelCreateSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('regression', 'classification', 'ensemble').required(),
  features: Joi.array().items(Joi.string()).required(),
});

const modelUpdateSchema = Joi.object({
  isActive: Joi.boolean().optional(),
});

const textAnalysisSchema = Joi.object({
  text: Joi.string().required(),
});

// Get AI prediction for a lead
router.post('/predict',
  authenticateToken,
  auditLog({ action: 'AI_PREDICT', entityType: 'LEAD' }),
  async (req, res) => {
    try {
      const { error, value } = predictionRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { leadId } = value;
      const prediction = await aiScoringService.predictScore(leadId);

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      console.error('Error predicting score:', error);
      res.status(500).json({ error: 'Failed to predict score' });
    }
  }
);

// Get all active AI models
router.get('/models',
  authenticateToken,
  async (req, res) => {
    try {
      const models = await aiScoringService.getActiveModels();
      
      res.json({
        success: true,
        data: models,
      });
    } catch (error) {
      console.error('Error getting models:', error);
      res.status(500).json({ error: 'Failed to get models' });
    }
  }
);

// Create a new AI model
router.post('/models',
  authenticateToken,
  auditLog({ action: 'AI_MODEL_CREATE', entityType: 'AI_MODEL' }),
  async (req, res) => {
    try {
      const { error, value } = modelCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const model = await aiScoringService.createModel(value);

      res.json({
        success: true,
        data: model,
      });
    } catch (error) {
      console.error('Error creating model:', error);
      res.status(500).json({ error: 'Failed to create model' });
    }
  }
);

// Update model status
router.patch('/models/:modelId',
  authenticateToken,
  auditLog({ action: 'AI_MODEL_UPDATE', entityType: 'AI_MODEL' }),
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const { error, value } = modelUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      if (value.isActive !== undefined) {
        await aiScoringService.updateModelStatus(modelId, value.isActive);
      }

      res.json({
        success: true,
        message: 'Model updated successfully',
      });
    } catch (error) {
      console.error('Error updating model:', error);
      res.status(500).json({ error: 'Failed to update model' });
    }
  }
);

// Get model performance
router.get('/models/:modelId/performance',
  authenticateToken,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const performance = await aiScoringService.getModelPerformance(modelId);

      if (!performance) {
        return res.status(404).json({ error: 'Model not found' });
      }

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error('Error getting model performance:', error);
      res.status(500).json({ error: 'Failed to get model performance' });
    }
  }
);

// Train a model
router.post('/models/:modelId/train',
  authenticateToken,
  auditLog({ action: 'AI_MODEL_TRAIN', entityType: 'AI_MODEL' }),
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const { trainingData } = req.body;

      if (!Array.isArray(trainingData) || trainingData.length === 0) {
        return res.status(400).json({ error: 'Training data is required' });
      }

      const performance = await aiScoringService.trainModel(modelId, trainingData);

      res.json({
        success: true,
        data: performance,
        message: 'Model trained successfully',
      });
    } catch (error) {
      console.error('Error training model:', error);
      res.status(500).json({ error: 'Failed to train model' });
    }
  }
);

// Analyze text content
router.post('/analyze-text',
  authenticateToken,
  auditLog({ action: 'AI_TEXT_ANALYSIS', entityType: 'TEXT' }),
  async (req, res) => {
    try {
      const { error, value } = textAnalysisSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const analysis = await aiScoringService.analyzeText(value.text);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error analyzing text:', error);
      res.status(500).json({ error: 'Failed to analyze text' });
    }
  }
);

// Get AI insights for dashboard
router.get('/insights',
  authenticateToken,
  async (req, res) => {
    try {
      const models = await aiScoringService.getActiveModels();
      
      // Calculate insights
      const totalModels = models.length;
      const activeModels = models.filter(m => m.isActive).length;
      const avgAccuracy = models.length > 0 
        ? models.reduce((sum, m) => sum + (m.performance?.accuracy || 0), 0) / models.length 
        : 0;

      const insights = {
        totalModels,
        activeModels,
        avgAccuracy: Math.round(avgAccuracy * 100) / 100,
        modelTypes: models.reduce((acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentActivity: models
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5)
          .map(m => ({
            id: m.id,
            name: m.name,
            type: m.type,
            accuracy: m.performance?.accuracy || 0,
            updatedAt: m.updatedAt
          }))
      };

      res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      console.error('Error getting AI insights:', error);
      res.status(500).json({ error: 'Failed to get AI insights' });
    }
  }
);

// Bulk predict scores for multiple leads
router.post('/bulk-predict',
  authenticateToken,
  auditLog({ action: 'AI_BULK_PREDICT', entityType: 'LEAD' }),
  async (req, res) => {
    try {
      const { leadIds } = req.body;

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: 'Lead IDs array is required' });
      }

      const predictions = [];
      const errors = [];

      for (const leadId of leadIds) {
        try {
          const prediction = await aiScoringService.predictScore(leadId);
          predictions.push({ leadId, prediction });
        } catch (error) {
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
    } catch (error) {
      console.error('Error bulk predicting scores:', error);
      res.status(500).json({ error: 'Failed to bulk predict scores' });
    }
  }
);

// Claude AI specific routes

// Get Claude configuration
router.get('/claude/config',
  authenticateToken,
  async (req, res) => {
    try {
      const config = {
        model: await getConfig('CLAUDE_MODEL') || 'claude-3-sonnet-20240229',
        maxTokens: await getConfig('CLAUDE_MAX_TOKENS') || '4000',
        temperature: await getConfig('CLAUDE_TEMPERATURE') || '0.7',
        isConfigured: !!(await getDecryptedConfig('CLAUDE_API_KEY'))
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting Claude config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Claude configuration'
      });
    }
  }
);

// Update Claude configuration
router.post('/claude/config',
  authenticateToken,
  auditLog({ action: 'CLAUDE_CONFIG_UPDATE', entityType: 'SYSTEM_CONFIG' }),
  async (req, res) => {
    try {
      const { model, maxTokens, temperature } = req.body;

      // Update configuration in database
      const updates = [];
      if (model) updates.push(prisma.systemConfig.upsert({
        where: { key: 'CLAUDE_MODEL' },
        update: { value: model },
        create: { 
          key: 'CLAUDE_MODEL', 
          value: model, 
          description: 'Claude model to use for AI scoring',
          category: 'AI_SCORING',
          createdById: req.user!.id
        }
      }));

      if (maxTokens) updates.push(prisma.systemConfig.upsert({
        where: { key: 'CLAUDE_MAX_TOKENS' },
        update: { value: maxTokens.toString() },
        create: { 
          key: 'CLAUDE_MAX_TOKENS', 
          value: maxTokens.toString(), 
          description: 'Maximum tokens for Claude API calls',
          category: 'AI_SCORING',
          createdById: req.user!.id
        }
      }));

      if (temperature !== undefined) updates.push(prisma.systemConfig.upsert({
        where: { key: 'CLAUDE_TEMPERATURE' },
        update: { value: temperature.toString() },
        create: { 
          key: 'CLAUDE_TEMPERATURE', 
          value: temperature.toString(), 
          description: 'Temperature setting for Claude API calls',
          category: 'AI_SCORING',
          createdById: req.user!.id
        }
      }));

      await Promise.all(updates);

      res.json({
        success: true,
        message: 'Claude configuration updated successfully'
      });
    } catch (error) {
      console.error('Error updating Claude config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update Claude configuration'
      });
    }
  }
);

// Test Claude API connection
router.post('/claude/test-connection',
  authenticateToken,
  async (req, res) => {
    try {
      const testResult = await aiScoringService.testClaudeConnection();
      
      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      console.error('Error testing Claude connection:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test Claude connection'
      });
    }
  }
);

// Get Claude API usage statistics
router.get('/claude/usage',
  authenticateToken,
  async (req, res) => {
    try {
      const usage = await aiScoringService.getClaudeUsageStats();
      
      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Error getting Claude usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Claude usage statistics'
      });
    }
  }
);

// Compare Claude vs ML model predictions
router.post('/claude/compare-predictions',
  authenticateToken,
  auditLog({ action: 'CLAUDE_COMPARE_PREDICTIONS', entityType: 'LEAD' }),
  async (req, res) => {
    try {
      const { leadId, modelIds } = req.body;

      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required'
        });
      }

      const comparison = await aiScoringService.compareClaudeVsML(leadId, modelIds);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing predictions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare predictions'
      });
    }
  }
);

// Enhanced content analysis with multiple perspectives
router.post('/claude/enhanced-analysis',
  authenticateToken,
  auditLog({ action: 'CLAUDE_ENHANCED_ANALYSIS', entityType: 'LEAD' }),
  async (req, res) => {
    try {
      const { content, industry = 'dental', analysisType = 'comprehensive' } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      const analysis = await aiScoringService.performEnhancedAnalysis(content, industry, analysisType);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error performing enhanced analysis:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform enhanced analysis'
      });
    }
  }
);

// Score lead with Claude AI
router.post('/claude/score-lead', async (req, res) => {
  try {
    const { leadData, industry = 'dental' } = req.body;

    if (!leadData) {
      return res.status(400).json({
        success: false,
        error: 'Lead data is required'
      });
    }

    const result = await aiScoringService.scoreLeadWithClaude(leadData, industry);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error scoring lead with Claude:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to score lead'
    });
  }
});

// Get criteria suggestions for industry
router.get('/claude/criteria-suggestions/:industry', async (req, res) => {
  try {
    const { industry } = req.params;

    const result = await aiScoringService.getCriteriaSuggestions(industry);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting criteria suggestions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get criteria suggestions'
    });
  }
});

// Get weight optimization recommendations
router.post('/claude/weight-optimization', async (req, res) => {
  try {
    const { currentWeights, performanceData } = req.body;

    if (!currentWeights || !performanceData) {
      return res.status(400).json({
        success: false,
        error: 'Current weights and performance data are required'
      });
    }

    const result = await aiScoringService.getWeightOptimizationRecommendations(
      currentWeights,
      performanceData
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting weight optimization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get weight optimization'
    });
  }
});

// Analyze lead content
router.post('/claude/analyze-content', async (req, res) => {
  try {
    const { content, industry = 'dental' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const result = await aiScoringService.analyzeLeadContent(content, industry);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze content'
    });
  }
});

console.log('aiScoring router defined:', typeof router);

export default router; 