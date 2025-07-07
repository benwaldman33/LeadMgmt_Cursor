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
const router = (0, express_1.Router)();
// Get all campaigns
router.get('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const campaigns = yield index_1.prisma.campaign.findMany({
            include: {
                createdBy: true,
                assignedTeam: true,
                scoringModel: true,
                leads: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ campaigns });
    }
    catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Create campaign
router.post('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, industry, status, scoringModelId, assignedTeamId, targetLeadCount, startDate, targetEndDate } = req.body;
        const campaign = yield index_1.prisma.campaign.create({
            data: {
                name,
                industry,
                status: status || 'PLANNING',
                scoringModelId,
                assignedTeamId,
                targetLeadCount,
                startDate: startDate ? new Date(startDate) : null,
                targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
                createdById: req.user.id,
            },
            include: {
                createdBy: true,
                assignedTeam: true,
                scoringModel: true,
            },
        });
        res.status(201).json({ campaign });
    }
    catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Update campaign
router.put('/:id', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, industry, status, scoringModelId, assignedTeamId, targetLeadCount, startDate, targetEndDate } = req.body;
        const campaign = yield index_1.prisma.campaign.update({
            where: { id },
            data: {
                name,
                industry,
                status,
                scoringModelId,
                assignedTeamId,
                targetLeadCount,
                startDate: startDate ? new Date(startDate) : null,
                targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
            },
            include: {
                createdBy: true,
                assignedTeam: true,
                scoringModel: true,
            },
        });
        res.json({ campaign });
    }
    catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
