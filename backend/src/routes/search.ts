import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { SearchService } from '../services/searchService';
import { validate } from '../middleware/validation';
import { prisma } from '../index';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const globalSearchSchema = Joi.object({
  query: Joi.string().min(1).required(),
  entityType: Joi.string().valid('LEAD', 'CAMPAIGN', 'USER', 'TEAM', 'SCORING_MODEL').optional(),
  status: Joi.string().optional(),
  campaignId: Joi.string().optional(),
  assignedToId: Joi.string().optional(),
  assignedTeamId: Joi.string().optional(),
  industry: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  scoreMin: Joi.number().min(0).max(100).optional(),
  scoreMax: Joi.number().min(0).max(100).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const leadSearchSchema = Joi.object({
  query: Joi.string().optional(),
  status: Joi.array().items(Joi.string()).optional(),
  campaignId: Joi.string().optional(),
  assignedToId: Joi.string().optional(),
  assignedTeamId: Joi.string().optional(),
  industry: Joi.string().optional(),
  scoreMin: Joi.number().min(0).max(100).optional(),
  scoreMax: Joi.number().min(0).max(100).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  enriched: Joi.boolean().optional(),
  scored: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const campaignSearchSchema = Joi.object({
  query: Joi.string().optional(),
  status: Joi.array().items(Joi.string()).optional(),
  createdById: Joi.string().optional(),
  assignedTeamId: Joi.string().optional(),
  industry: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const suggestionsSchema = Joi.object({
  query: Joi.string().min(1).required(),
  entityType: Joi.string().valid('LEAD', 'CAMPAIGN', 'USER', 'TEAM', 'SCORING_MODEL').optional(),
});

/**
 * POST /api/search/global
 * Global search across all entities
 */
router.post('/global',
  authenticateToken,
  validate(globalSearchSchema),
  async (req, res) => {
    try {
      const filters = {
        query: req.body.query,
        entityType: req.body.entityType,
        status: req.body.status,
        campaignId: req.body.campaignId,
        assignedToId: req.body.assignedToId,
        assignedTeamId: req.body.assignedTeamId,
        industry: req.body.industry,
        dateFrom: req.body.dateFrom ? new Date(req.body.dateFrom) : undefined,
        dateTo: req.body.dateTo ? new Date(req.body.dateTo) : undefined,
        scoreMin: req.body.scoreMin,
        scoreMax: req.body.scoreMax,
        limit: req.body.limit || 20,
        offset: req.body.offset || 0,
      };

      const results = await SearchService.globalSearch(filters);
      
      res.json({
        success: true,
        data: {
          results,
          total: results.length,
          query: filters.query,
        },
      });
    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform global search',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/search/leads
 * Advanced lead search and filtering
 */
router.post('/leads',
  authenticateToken,
  validate(leadSearchSchema),
  async (req, res) => {
    try {
      const filters = {
        query: req.body.query,
        status: req.body.status,
        campaignId: req.body.campaignId,
        assignedToId: req.body.assignedToId,
        assignedTeamId: req.body.assignedTeamId,
        industry: req.body.industry,
        scoreMin: req.body.scoreMin,
        scoreMax: req.body.scoreMax,
        dateFrom: req.body.dateFrom ? new Date(req.body.dateFrom) : undefined,
        dateTo: req.body.dateTo ? new Date(req.body.dateTo) : undefined,
        enriched: req.body.enriched,
        scored: req.body.scored,
        limit: req.body.limit || 50,
        offset: req.body.offset || 0,
      };

      const result = await SearchService.searchLeads(filters);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Lead search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search leads',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/search/campaigns
 * Advanced campaign search and filtering
 */
router.post('/campaigns',
  authenticateToken,
  validate(campaignSearchSchema),
  async (req, res) => {
    try {
      const filters = {
        query: req.body.query,
        status: req.body.status,
        createdById: req.body.createdById,
        assignedTeamId: req.body.assignedTeamId,
        industry: req.body.industry,
        dateFrom: req.body.dateFrom ? new Date(req.body.dateFrom) : undefined,
        dateTo: req.body.dateTo ? new Date(req.body.dateTo) : undefined,
        limit: req.body.limit || 50,
        offset: req.body.offset || 0,
      };

      const result = await SearchService.searchCampaigns(filters);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Campaign search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search campaigns',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/search/suggestions
 * Get search suggestions for autocomplete
 */
router.get('/suggestions',
  authenticateToken,
  validate(suggestionsSchema),
  async (req, res) => {
    try {
      const { query, entityType } = req.query;
      const suggestions = await SearchService.getSearchSuggestions(
        query as string,
        entityType as string
      );
      
      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get search suggestions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/search/filters
 * Get available filter options
 */
router.get('/filters',
  authenticateToken,
  async (req, res) => {
    try {
      // Get available statuses, industries, etc. for filter dropdowns
      const [leadStatuses, campaignStatuses, industries, campaigns, users, teams] = await Promise.all([
        // Get unique lead statuses
        prisma.lead.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        // Get unique campaign statuses
        prisma.campaign.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        // Get unique industries
        prisma.lead.groupBy({
          by: ['industry'],
          _count: { industry: true },
        }),
        // Get campaigns for filter
        prisma.campaign.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        // Get users for filter
        prisma.user.findMany({
          select: { id: true, fullName: true, email: true },
          orderBy: { fullName: 'asc' },
        }),
        // Get teams for filter
        prisma.team.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      res.json({
        success: true,
        data: {
          leadStatuses: leadStatuses.map((s: any) => ({ value: s.status, count: s._count.status })),
          campaignStatuses: campaignStatuses.map((s: any) => ({ value: s.status, count: s._count.status })),
          industries: industries.map((i: any) => ({ value: i.industry, count: i._count.industry })),
          campaigns: campaigns.map((c: any) => ({ id: c.id, name: c.name })),
          users: users.map((u: any) => ({ id: u.id, name: u.fullName, email: u.email })),
          teams: teams.map((t: any) => ({ id: t.id, name: t.name })),
        },
      });
    } catch (error) {
      console.error('Get filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get filter options',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router; 