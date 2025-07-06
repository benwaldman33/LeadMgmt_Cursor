import express from 'express';
import Joi from 'joi';
import { reportingService, ReportConfig } from '../services/reportingService.js';
import { authenticateToken } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Validation schemas
const reportFilterSchema = Joi.object({
  dateRange: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required(),
  }).optional(),
  campaignIds: Joi.array().items(Joi.string()).optional(),
  teamIds: Joi.array().items(Joi.string()).optional(),
  userIds: Joi.array().items(Joi.string()).optional(),
  status: Joi.array().items(Joi.string()).optional(),
  industry: Joi.array().items(Joi.string()).optional(),
  scoreRange: Joi.object({
    min: Joi.number().min(0).max(100).required(),
    max: Joi.number().min(0).max(100).required(),
  }).optional(),
});

const reportConfigSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  type: Joi.string().valid('lead_analysis', 'campaign_performance', 'team_performance', 'scoring_analysis', 'conversion_funnel').required(),
  filters: reportFilterSchema.required(),
  metrics: Joi.array().items(Joi.string()).required(),
  chartTypes: Joi.array().items(Joi.string().valid('bar', 'line', 'pie', 'funnel')).required(),
  groupBy: Joi.string().optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().positive().optional(),
});

// Generate custom report
router.post('/generate', 
  authenticateToken,
  auditLog({ action: 'REPORT_GENERATE', entityType: 'REPORT' }),
  async (req, res) => {
    try {
      const { error, value } = reportConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const config: ReportConfig = value;
      const report = await reportingService.generateReport(config);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

// Export report to Excel
router.post('/export/excel',
  authenticateToken,
  auditLog({ action: 'REPORT_EXPORT', entityType: 'REPORT', getDescription: () => 'Export to Excel' }),
  async (req, res) => {
    try {
      const { reportResult, filename } = req.body;

      if (!reportResult || !filename) {
        return res.status(400).json({ error: 'Report result and filename are required' });
      }

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const filePath = await reportingService.exportToExcel(reportResult, filename);
      
      res.json({
        success: true,
        data: {
          filePath,
          filename: `${filename}.xlsx`,
          downloadUrl: `/api/reports/download/${path.basename(filePath)}`
        }
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      res.status(500).json({ error: 'Failed to export to Excel' });
    }
  }
);

// Export report to PDF
router.post('/export/pdf',
  authenticateToken,
  auditLog({ action: 'REPORT_EXPORT', entityType: 'REPORT', getDescription: () => 'Export to PDF' }),
  async (req, res) => {
    try {
      const { reportResult, filename } = req.body;

      if (!reportResult || !filename) {
        return res.status(400).json({ error: 'Report result and filename are required' });
      }

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const filePath = await reportingService.exportToPDF(reportResult, filename);
      
      res.json({
        success: true,
        data: {
          filePath,
          filename: `${filename}.pdf`,
          downloadUrl: `/api/reports/download/${path.basename(filePath)}`
        }
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      res.status(500).json({ error: 'Failed to export to PDF' });
    }
  }
);

// Export report to CSV
router.post('/export/csv',
  authenticateToken,
  auditLog({ action: 'REPORT_EXPORT', entityType: 'REPORT', getDescription: () => 'Export to CSV' }),
  async (req, res) => {
    try {
      const { reportResult, filename } = req.body;

      if (!reportResult || !filename) {
        return res.status(400).json({ error: 'Report result and filename are required' });
      }

      // Ensure exports directory exists
      const exportsDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const filePath = await reportingService.exportToCSV(reportResult, filename);
      
      res.json({
        success: true,
        data: {
          filePath,
          filename: `${filename}.csv`,
          downloadUrl: `/api/reports/download/${path.basename(filePath)}`
        }
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      res.status(500).json({ error: 'Failed to export to CSV' });
    }
  }
);

// Download exported file
router.get('/download/:filename',
  authenticateToken,
  async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../exports', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(filePath, filename);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
);

// Get available report types and metrics
router.get('/types',
  authenticateToken,
  async (req, res) => {
    try {
      const reportTypes = [
        {
          id: 'lead_analysis',
          name: 'Lead Analysis',
          description: 'Analyze lead performance, scoring, and conversion rates',
          metrics: ['totalValue', 'averageCompanySize', 'technologyCount'],
          chartTypes: ['bar', 'line', 'pie'],
          groupByOptions: ['status', 'industry', 'campaign', 'assignedTeam', 'assignedTo']
        },
        {
          id: 'campaign_performance',
          name: 'Campaign Performance',
          description: 'Track campaign effectiveness and ROI',
          metrics: ['totalValue', 'conversionRate', 'averageScore'],
          chartTypes: ['bar', 'line', 'pie'],
          groupByOptions: ['industry', 'status', 'assignedTeam']
        },
        {
          id: 'team_performance',
          name: 'Team Performance',
          description: 'Monitor team productivity and success rates',
          metrics: ['totalValue', 'conversionRate', 'averageScore'],
          chartTypes: ['bar', 'line', 'pie'],
          groupByOptions: ['industry', 'status', 'campaign']
        },
        {
          id: 'scoring_analysis',
          name: 'Scoring Analysis',
          description: 'Analyze scoring model effectiveness and trends',
          metrics: ['averageScore', 'qualifiedCount', 'conversionRate'],
          chartTypes: ['bar', 'line', 'pie'],
          groupByOptions: ['lead', 'campaign', 'team', 'status']
        },
        {
          id: 'conversion_funnel',
          name: 'Conversion Funnel',
          description: 'Track lead progression through sales funnel',
          metrics: ['conversionRate', 'stageCount', 'dropoffRate'],
          chartTypes: ['funnel', 'bar', 'line'],
          groupByOptions: ['campaign', 'team', 'industry']
        }
      ];

      res.json({
        success: true,
        data: reportTypes
      });
    } catch (error) {
      console.error('Error getting report types:', error);
      res.status(500).json({ error: 'Failed to get report types' });
    }
  }
);

// Get available filters and options
router.get('/filters',
  authenticateToken,
  async (req, res) => {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const [campaigns, teams, users, industries, statuses] = await Promise.all([
        prisma.campaign.findMany({ select: { id: true, name: true } }),
        prisma.team.findMany({ select: { id: true, name: true } }),
        prisma.user.findMany({ select: { id: true, fullName: true } }),
        prisma.lead.findMany({ 
          select: { industry: true },
          where: { industry: { not: null } },
          distinct: ['industry']
        }),
        prisma.lead.findMany({
          select: { status: true },
          distinct: ['status']
        })
      ]);

      res.json({
        success: true,
        data: {
          campaigns: campaigns.map((c: any) => ({ id: c.id, name: c.name })),
          teams: teams.map((t: any) => ({ id: t.id, name: t.name })),
          users: users.map((u: any) => ({ id: u.id, name: u.fullName })),
          industries: industries.map((i: any) => i.industry).filter(Boolean),
          statuses: statuses.map((s: any) => s.status).filter(Boolean),
        }
      });
    } catch (error) {
      console.error('Error getting filters:', error);
      res.status(500).json({ error: 'Failed to get filters' });
    }
  }
);

// Get saved reports (placeholder for future implementation)
router.get('/saved',
  authenticateToken,
  async (req, res) => {
    try {
      // TODO: Implement saved reports functionality
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error('Error getting saved reports:', error);
      res.status(500).json({ error: 'Failed to get saved reports' });
    }
  }
);

// Save report configuration
router.post('/save',
  authenticateToken,
  auditLog({ action: 'REPORT_SAVE', entityType: 'REPORT' }),
  async (req, res) => {
    try {
      const { error, value } = reportConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // TODO: Implement saved reports functionality
      res.json({
        success: true,
        data: { id: 'temp-id', ...value }
      });
    } catch (error) {
      console.error('Error saving report:', error);
      res.status(500).json({ error: 'Failed to save report' });
    }
  }
);

export default router; 