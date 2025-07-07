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
const analyticsService_1 = require("../services/analyticsService");
const router = express_1.default.Router();
/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard metrics
 */
router.get('/dashboard', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metrics = yield analyticsService_1.AnalyticsService.getDashboardMetrics();
        res.json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
        console.error('Dashboard metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard metrics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/trends
 * Get lead trends over time
 */
router.get('/trends', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const trends = yield analyticsService_1.AnalyticsService.getLeadTrends(days);
        res.json({
            success: true,
            data: trends,
        });
    }
    catch (error) {
        console.error('Lead trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get lead trends',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/scoring
 * Get scoring analytics
 */
router.get('/scoring', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const analytics = yield analyticsService_1.AnalyticsService.getScoringAnalytics();
        res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
        console.error('Scoring analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get scoring analytics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/campaigns
 * Get campaign performance analytics
 */
router.get('/campaigns', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const performance = yield analyticsService_1.AnalyticsService.getCampaignPerformance();
        res.json({
            success: true,
            data: performance,
        });
    }
    catch (error) {
        console.error('Campaign performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get campaign performance',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/teams
 * Get team performance analytics
 */
router.get('/teams', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const performance = yield analyticsService_1.AnalyticsService.getTeamPerformance();
        res.json({
            success: true,
            data: performance,
        });
    }
    catch (error) {
        console.error('Team performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get team performance',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/users
 * Get user activity analytics
 */
router.get('/users', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activity = yield analyticsService_1.AnalyticsService.getUserActivity();
        res.json({
            success: true,
            data: activity,
        });
    }
    catch (error) {
        console.error('User activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user activity',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/industries
 * Get industry distribution
 */
router.get('/industries', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const distribution = yield analyticsService_1.AnalyticsService.getIndustryDistribution();
        res.json({
            success: true,
            data: distribution,
        });
    }
    catch (error) {
        console.error('Industry distribution error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get industry distribution',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/status
 * Get status distribution
 */
router.get('/status', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const distribution = yield analyticsService_1.AnalyticsService.getStatusDistribution();
        res.json({
            success: true,
            data: distribution,
        });
    }
    catch (error) {
        console.error('Status distribution error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get status distribution',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/recent-leads
 * Get recent leads with scores
 */
router.get('/recent-leads', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const leads = yield analyticsService_1.AnalyticsService.getRecentLeads(limit);
        res.json({
            success: true,
            data: leads,
        });
    }
    catch (error) {
        console.error('Recent leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent leads',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
/**
 * GET /api/analytics/funnel
 * Get conversion funnel data
 */
router.get('/funnel', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const funnel = yield analyticsService_1.AnalyticsService.getConversionFunnel();
        res.json({
            success: true,
            data: funnel,
        });
    }
    catch (error) {
        console.error('Conversion funnel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversion funnel',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
exports.default = router;
