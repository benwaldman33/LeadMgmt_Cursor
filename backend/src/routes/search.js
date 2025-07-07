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
const auth_1 = require("../middleware/auth");
const searchService_1 = require("../services/searchService");
const validation_1 = require("../middleware/validation");
const index_1 = require("../index");
const joi_1 = __importDefault(require("joi"));
const router = express_1.default.Router();
// Validation schemas
const globalSearchSchema = joi_1.default.object({
    query: joi_1.default.string().min(1).required(),
    entityType: joi_1.default.string().valid('LEAD', 'CAMPAIGN', 'USER', 'TEAM', 'SCORING_MODEL').optional(),
    status: joi_1.default.string().optional(),
    campaignId: joi_1.default.string().optional(),
    assignedToId: joi_1.default.string().optional(),
    assignedTeamId: joi_1.default.string().optional(),
    industry: joi_1.default.string().optional(),
    dateFrom: joi_1.default.date().optional(),
    dateTo: joi_1.default.date().optional(),
    scoreMin: joi_1.default.number().min(0).max(100).optional(),
    scoreMax: joi_1.default.number().min(0).max(100).optional(),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    offset: joi_1.default.number().integer().min(0).default(0),
});
const leadSearchSchema = joi_1.default.object({
    query: joi_1.default.string().optional(),
    status: joi_1.default.array().items(joi_1.default.string()).optional(),
    campaignId: joi_1.default.string().optional(),
    assignedToId: joi_1.default.string().optional(),
    assignedTeamId: joi_1.default.string().optional(),
    industry: joi_1.default.string().optional(),
    scoreMin: joi_1.default.number().min(0).max(100).optional(),
    scoreMax: joi_1.default.number().min(0).max(100).optional(),
    dateFrom: joi_1.default.date().optional(),
    dateTo: joi_1.default.date().optional(),
    enriched: joi_1.default.boolean().optional(),
    scored: joi_1.default.boolean().optional(),
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0),
});
const campaignSearchSchema = joi_1.default.object({
    query: joi_1.default.string().optional(),
    status: joi_1.default.array().items(joi_1.default.string()).optional(),
    createdById: joi_1.default.string().optional(),
    assignedTeamId: joi_1.default.string().optional(),
    industry: joi_1.default.string().optional(),
    dateFrom: joi_1.default.date().optional(),
    dateTo: joi_1.default.date().optional(),
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0),
});
const suggestionsSchema = joi_1.default.object({
    query: joi_1.default.string().min(1).required(),
    entityType: joi_1.default.string().valid('LEAD', 'CAMPAIGN', 'USER', 'TEAM', 'SCORING_MODEL').optional(),
});
/**
 * POST /api/search/global
 * Global search across all entities
 */
router.post('/global', auth_1.authenticateToken, (0, validation_1.validate)(globalSearchSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const results = yield searchService_1.SearchService.globalSearch(filters);
        res.json({
            success: true,
            data: {
                results,
                total: results.length,
                query: filters.query,
            },
        });
    }
    catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform global search',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * POST /api/search/leads
 * Advanced lead search and filtering
 */
router.post('/leads', auth_1.authenticateToken, (0, validation_1.validate)(leadSearchSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield searchService_1.SearchService.searchLeads(filters);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Lead search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search leads',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * POST /api/search/campaigns
 * Advanced campaign search and filtering
 */
router.post('/campaigns', auth_1.authenticateToken, (0, validation_1.validate)(campaignSearchSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield searchService_1.SearchService.searchCampaigns(filters);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Campaign search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search campaigns',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/search/suggestions
 * Get search suggestions for autocomplete
 */
router.get('/suggestions', auth_1.authenticateToken, (0, validation_1.validate)(suggestionsSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query, entityType } = req.query;
        const suggestions = yield searchService_1.SearchService.getSearchSuggestions(query, entityType);
        res.json({
            success: true,
            data: suggestions,
        });
    }
    catch (error) {
        console.error('Search suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get search suggestions',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/search/filters
 * Get available filter options
 */
router.get('/filters', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get available statuses, industries, etc. for filter dropdowns
        const [leadStatuses, campaignStatuses, industries, campaigns, users, teams] = yield Promise.all([
            // Get unique lead statuses
            index_1.prisma.lead.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            // Get unique campaign statuses
            index_1.prisma.campaign.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            // Get unique industries
            index_1.prisma.lead.groupBy({
                by: ['industry'],
                _count: { industry: true },
            }),
            // Get campaigns for filter
            index_1.prisma.campaign.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            // Get users for filter
            index_1.prisma.user.findMany({
                select: { id: true, fullName: true, email: true },
                orderBy: { fullName: 'asc' },
            }),
            // Get teams for filter
            index_1.prisma.team.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
        ]);
        res.json({
            success: true,
            data: {
                leadStatuses: leadStatuses.map((s) => ({ value: s.status, count: s._count.status })),
                campaignStatuses: campaignStatuses.map((s) => ({ value: s.status, count: s._count.status })),
                industries: industries.map((i) => ({ value: i.industry, count: i._count.industry })),
                campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
                users: users.map((u) => ({ id: u.id, name: u.fullName, email: u.email })),
                teams: teams.map((t) => ({ id: t.id, name: t.name })),
            },
        });
    }
    catch (error) {
        console.error('Get filters error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get filter options',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
exports.default = router;
