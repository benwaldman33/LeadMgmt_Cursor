"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const validation_1 = require("../middleware/validation");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const reportingService_1 = require("../services/reportingService");
const router = express_1.default.Router();
// Validation schemas
const reportFilterSchema = joi_1.default.object({
    dateRange: joi_1.default.object({
        start: joi_1.default.date().required(),
        end: joi_1.default.date().required(),
    }).optional(),
    campaignIds: joi_1.default.array().items(joi_1.default.string()).optional(),
    teamIds: joi_1.default.array().items(joi_1.default.string()).optional(),
    userIds: joi_1.default.array().items(joi_1.default.string()).optional(),
    status: joi_1.default.array().items(joi_1.default.string()).optional(),
    industry: joi_1.default.array().items(joi_1.default.string()).optional(),
    scoreRange: joi_1.default.object({
        min: joi_1.default.number().min(0).max(100).required(),
        max: joi_1.default.number().min(0).max(100).required(),
    }).optional(),
});
const reportConfigSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    filters: joi_1.default.object().optional(),
    metrics: joi_1.default.array().items(joi_1.default.string()).optional(),
    chartType: joi_1.default.string().optional(),
    groupBy: joi_1.default.string().optional(),
    dateRange: joi_1.default.object({
        start: joi_1.default.date().optional(),
        end: joi_1.default.date().optional()
    }).optional()
});
// Generate report
router.post('/generate', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'REPORT_GENERATE', entityType: 'REPORT' }), (0, validation_1.validateRequest)(reportConfigSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reportConfig = req.body;
        const reportResult = yield reportingService_1.reportingService.generateReport(reportConfig);
        res.json({ success: true, data: reportResult });
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
}));
// Export report to Excel
router.post('/export/excel', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'REPORT_EXPORT', entityType: 'REPORT', getDescription: () => 'Export to Excel' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reportResult, filename } = req.body;
        if (!reportResult || !filename) {
            return res.status(400).json({ error: 'Report result and filename are required' });
        }
        // Ensure exports directory exists
        const exportsDir = path_1.default.join(__dirname, '../../exports');
        if (!fs_1.default.existsSync(exportsDir)) {
            fs_1.default.mkdirSync(exportsDir, { recursive: true });
        }
        const excelPath = yield reportingService_1.reportingService.exportToExcel(reportResult, filename);
        res.json({
            success: true,
            data: {
                filePath: excelPath.replace(process.cwd(), ''),
                filename: `${filename}.xlsx`,
                downloadUrl: `/api/reports/download/${filename}.xlsx`
            }
        });
    }
    catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ error: 'Failed to export to Excel' });
    }
}));
// Export report to PDF
router.post('/export/pdf', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'REPORT_EXPORT', entityType: 'REPORT', getDescription: () => 'Export to PDF' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reportResult, filename } = req.body;
        if (!reportResult || !filename) {
            return res.status(400).json({ error: 'Report result and filename are required' });
        }
        // Ensure exports directory exists
        const exportsDir = path_1.default.join(__dirname, '../../exports');
        if (!fs_1.default.existsSync(exportsDir)) {
            fs_1.default.mkdirSync(exportsDir, { recursive: true });
        }
        const pdfPath = yield reportingService_1.reportingService.exportToPDF(reportResult, filename);
        res.json({
            success: true,
            data: {
                filePath: pdfPath.replace(process.cwd(), ''),
                filename: `${filename}.pdf`,
                downloadUrl: `/api/reports/download/${filename}.pdf`
            }
        });
    }
    catch (error) {
        console.error('Error exporting to PDF:', error);
        res.status(500).json({ error: 'Failed to export to PDF' });
    }
}));
// Export report to CSV
router.post('/export/csv', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'REPORT_EXPORT', entityType: 'REPORT', getDescription: () => 'Export to CSV' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reportResult, filename } = req.body;
        if (!reportResult || !filename) {
            return res.status(400).json({ error: 'Report result and filename are required' });
        }
        // Ensure exports directory exists
        const exportsDir = path_1.default.join(__dirname, '../../exports');
        if (!fs_1.default.existsSync(exportsDir)) {
            fs_1.default.mkdirSync(exportsDir, { recursive: true });
        }
        const csvPath = yield reportingService_1.reportingService.exportToCSV(reportResult, filename);
        res.json({
            success: true,
            data: {
                filePath: csvPath.replace(process.cwd(), ''),
                filename: `${filename}.csv`,
                downloadUrl: `/api/reports/download/${filename}.csv`
            }
        });
    }
    catch (error) {
        console.error('Error exporting to CSV:', error);
        res.status(500).json({ error: 'Failed to export to CSV' });
    }
}));
// Download exported file
router.get('/download/:filename', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(__dirname, '../../exports', filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.download(filePath, filename);
    }
    catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
}));
// Get report types
router.get('/types', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reportTypes = [
            {
                id: 'lead_analytics',
                name: 'Lead Analytics',
                description: 'Comprehensive lead analysis and insights',
                metrics: ['totalLeads', 'conversionRate', 'averageScore'],
                chartTypes: ['bar', 'line', 'pie'],
                groupByOptions: ['industry', 'status', 'campaign', 'team']
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
    }
    catch (error) {
        console.error('Error getting report types:', error);
        res.status(500).json({ error: 'Failed to get report types' });
    }
}));
// Get available filters and options
router.get('/filters', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { PrismaClient } = yield Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        // Handle potential database connection issues
        try {
            const [campaigns, teams, users, industries, statuses] = yield Promise.all([
                prisma.campaign.findMany({ select: { id: true, name: true } }).catch(() => []),
                prisma.team.findMany({ select: { id: true, name: true } }).catch(() => []),
                prisma.user.findMany({ select: { id: true, fullName: true } }).catch(() => []),
                prisma.lead.findMany({
                    select: { industry: true },
                    where: { industry: { not: null } },
                    distinct: ['industry']
                }).catch(() => []),
                prisma.lead.findMany({
                    select: { status: true },
                    distinct: ['status']
                }).catch(() => [])
            ]);
            res.json({
                success: true,
                data: {
                    campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
                    teams: teams.map((t) => ({ id: t.id, name: t.name })),
                    users: users.map((u) => ({ id: u.id, name: u.fullName })),
                    industries: industries.map((i) => i.industry).filter(Boolean),
                    statuses: statuses.map((s) => s.status).filter(Boolean),
                }
            });
        }
        catch (dbError) {
            console.error('Database error in filters endpoint:', dbError);
            // Return empty arrays if database queries fail
            res.json({
                success: true,
                data: {
                    campaigns: [],
                    teams: [],
                    users: [],
                    industries: [],
                    statuses: [],
                }
            });
        }
        finally {
            yield prisma.$disconnect();
        }
    }
    catch (error) {
        console.error('Error getting filters:', error);
        res.status(500).json({ error: 'Failed to get filters' });
    }
}));
// Get saved reports (placeholder for future implementation)
router.get('/saved', auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // TODO: Implement saved reports functionality
        res.json({
            success: true,
            data: []
        });
    }
    catch (error) {
        console.error('Error getting saved reports:', error);
        res.status(500).json({ error: 'Failed to get saved reports' });
    }
}));
// Save report configuration
router.post('/save', auth_1.authenticateToken, (0, auditLog_1.auditLog)({ action: 'REPORT_SAVE', entityType: 'REPORT' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error, value } = reportConfigSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        // TODO: Implement saved reports functionality
        res.json({
            success: true,
            data: Object.assign({ id: 'temp-id' }, value)
        });
    }
    catch (error) {
        console.error('Error saving report:', error);
        res.status(500).json({ error: 'Failed to save report' });
    }
}));
exports.default = router;
