import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard metrics
 */
router.get('/dashboard',
  authenticateToken,
  async (req, res) => {
    try {
      const metrics = await AnalyticsService.getDashboardMetrics();
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/trends
 * Get lead trends over time
 */
router.get('/trends',
  authenticateToken,
  async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const trends = await AnalyticsService.getLeadTrends(days);
      
      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      console.error('Lead trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get lead trends',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/scoring
 * Get scoring analytics
 */
router.get('/scoring',
  authenticateToken,
  async (req, res) => {
    try {
      const analytics = await AnalyticsService.getScoringAnalytics();
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Scoring analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get scoring analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/campaigns
 * Get campaign performance analytics
 */
router.get('/campaigns',
  authenticateToken,
  async (req, res) => {
    try {
      const performance = await AnalyticsService.getCampaignPerformance();
      
      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error('Campaign performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get campaign performance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/teams
 * Get team performance analytics
 */
router.get('/teams',
  authenticateToken,
  async (req, res) => {
    try {
      const performance = await AnalyticsService.getTeamPerformance();
      
      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error('Team performance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get team performance',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/users
 * Get user activity analytics
 */
router.get('/users',
  authenticateToken,
  async (req, res) => {
    try {
      const activity = await AnalyticsService.getUserActivity();
      
      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      console.error('User activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user activity',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/industries
 * Get industry distribution
 */
router.get('/industries',
  authenticateToken,
  async (req, res) => {
    try {
      const distribution = await AnalyticsService.getIndustryDistribution();
      
      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      console.error('Industry distribution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get industry distribution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/status
 * Get status distribution
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const distribution = await AnalyticsService.getStatusDistribution();
      
      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      console.error('Status distribution error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get status distribution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/recent-leads
 * Get recent leads with scores
 */
router.get('/recent-leads',
  authenticateToken,
  async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leads = await AnalyticsService.getRecentLeads(limit);
      
      res.json({
        success: true,
        data: leads,
      });
    } catch (error) {
      console.error('Recent leads error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent leads',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/analytics/funnel
 * Get conversion funnel data
 */
router.get('/funnel',
  authenticateToken,
  async (req, res) => {
    try {
      const funnel = await AnalyticsService.getConversionFunnel();
      
      res.json({
        success: true,
        data: funnel,
      });
    } catch (error) {
      console.error('Conversion funnel error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversion funnel',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router; 