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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const index_1 = require("../index");
const scoringService_1 = require("../services/scoringService");
const router = (0, express_1.Router)();
// Get all scoring models
router.get('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { industry } = req.query;
        const where = { isActive: true };
        if (industry)
            where.industry = industry;
        const scoringModels = yield index_1.prisma.scoringModel.findMany({
            where,
            include: {
                criteria: true,
                createdBy: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ scoringModels });
    }
    catch (error) {
        console.error('Get scoring models error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Create scoring model
router.post('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, industry, criteria } = req.body;
        const scoringModel = yield index_1.prisma.scoringModel.create({
            data: {
                name,
                industry,
                createdById: req.user.id,
                criteria: {
                    create: criteria.map((criterion) => ({
                        name: criterion.name,
                        description: criterion.description,
                        searchTerms: JSON.stringify(criterion.searchTerms),
                        weight: criterion.weight,
                        type: criterion.type,
                    })),
                },
            },
            include: {
                criteria: true,
                createdBy: true,
            },
        });
        res.status(201).json({ scoringModel });
    }
    catch (error) {
        console.error('Create scoring model error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Score a single lead
router.post('/score-lead', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadId, scoringModelId } = req.body;
        if (!leadId || !scoringModelId) {
            return res.status(400).json({ error: 'Lead ID and Scoring Model ID are required' });
        }
        const scoringResult = yield scoringService_1.ScoringService.scoreLead(leadId, scoringModelId);
        yield scoringService_1.ScoringService.saveScoringResult(leadId, scoringResult);
        res.json({
            success: true,
            scoringResult,
            message: 'Lead scored successfully'
        });
    }
    catch (error) {
        console.error('Score lead error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}));
// Score all leads in a campaign
router.post('/score-campaign', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { campaignId } = req.body;
        if (!campaignId) {
            return res.status(400).json({ error: 'Campaign ID is required' });
        }
        const result = yield scoringService_1.ScoringService.scoreCampaignLeads(campaignId);
        res.json({
            success: true,
            result,
            message: `Scored ${result.scoredLeads} leads, ${result.qualifiedLeads} qualified`
        });
    }
    catch (error) {
        console.error('Score campaign error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}));
// Get scoring results for a lead
router.get('/results/:leadId', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadId } = req.params;
        const scoringResult = yield index_1.prisma.scoringResult.findUnique({
            where: { leadId },
            include: {
                criteriaScores: true,
                lead: {
                    include: {
                        campaign: {
                            include: {
                                scoringModel: true
                            }
                        }
                    }
                }
            }
        });
        if (!scoringResult) {
            return res.status(404).json({ error: 'Scoring result not found' });
        }
        res.json({ scoringResult });
    }
    catch (error) {
        console.error('Get scoring results error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get single scoring model by ID
router.get('/:id', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const scoringModel = yield index_1.prisma.scoringModel.findUnique({
            where: { id },
            include: {
                criteria: true,
                createdBy: true,
            },
        });
        if (!scoringModel) {
            return res.status(404).json({ error: 'Scoring model not found' });
        }
        res.json({ scoringModel });
    }
    catch (error) {
        console.error('Get scoring model error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Update scoring model
router.put('/:id', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, industry, criteria } = req.body;
        // Check if model exists
        const existingModel = yield index_1.prisma.scoringModel.findUnique({
            where: { id },
            include: { criteria: true }
        });
        if (!existingModel) {
            return res.status(404).json({ error: 'Scoring model not found' });
        }
        // Update model and criteria in a transaction
        const updatedModel = yield index_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update the model
            const model = yield tx.scoringModel.update({
                where: { id },
                data: {
                    name,
                    industry,
                    updatedAt: new Date(),
                },
            });
            // Delete existing criteria
            yield tx.scoringCriterion.deleteMany({
                where: { scoringModelId: id }
            });
            // Create new criteria
            const newCriteria = yield Promise.all(criteria.map((criterion) => tx.scoringCriterion.create({
                data: {
                    name: criterion.name,
                    description: criterion.description,
                    searchTerms: JSON.stringify(criterion.searchTerms),
                    weight: criterion.weight,
                    type: criterion.type,
                    scoringModelId: id,
                },
            })));
            return Object.assign(Object.assign({}, model), { criteria: newCriteria });
        }));
        res.json({ scoringModel: updatedModel });
    }
    catch (error) {
        console.error('Update scoring model error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Delete scoring model
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if model exists
        const existingModel = yield index_1.prisma.scoringModel.findUnique({
            where: { id },
            include: { criteria: true }
        });
        if (!existingModel) {
            return res.status(404).json({ error: 'Scoring model not found' });
        }
        // Check if model is being used by any campaigns
        const campaignsUsingModel = yield index_1.prisma.campaign.findMany({
            where: { scoringModelId: id }
        });
        if (campaignsUsingModel.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete scoring model that is being used by campaigns',
                campaigns: campaignsUsingModel.map(c => ({ id: c.id, name: c.name }))
            });
        }
        // Delete model (criteria will be deleted automatically due to cascade)
        yield index_1.prisma.scoringModel.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Scoring model deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete scoring model error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Duplicate scoring model
router.post('/:id/duplicate', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        // Get the original model
        const originalModel = yield index_1.prisma.scoringModel.findUnique({
            where: { id },
            include: { criteria: true }
        });
        if (!originalModel) {
            return res.status(404).json({ error: 'Scoring model not found' });
        }
        // Create duplicate model
        const duplicatedModel = yield index_1.prisma.scoringModel.create({
            data: {
                name: name || `${originalModel.name} (Copy)`,
                industry: originalModel.industry,
                createdById: req.user.id,
                criteria: {
                    create: originalModel.criteria.map(criterion => ({
                        name: criterion.name,
                        description: criterion.description,
                        searchTerms: criterion.searchTerms,
                        weight: criterion.weight,
                        type: criterion.type,
                    })),
                },
            },
            include: {
                criteria: true,
                createdBy: true,
            },
        });
        res.status(201).json({ scoringModel: duplicatedModel });
    }
    catch (error) {
        console.error('Duplicate scoring model error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
