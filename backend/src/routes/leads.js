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
const validation_1 = require("../middleware/validation");
const index_1 = require("../index");
const scoringService_1 = require("../services/scoringService");
const websocketService_1 = require("../services/websocketService");
const webScrapingService_1 = require("../services/webScrapingService");
const pipelineService_1 = require("../services/pipelineService");
const router = (0, express_1.Router)();
// Get all leads
router.get('/', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { campaignId, status, limit = 50, offset = 0 } = req.query;
        const where = {};
        if (campaignId)
            where.campaignId = campaignId;
        if (status)
            where.status = status;
        const leads = yield index_1.prisma.lead.findMany({
            where,
            include: {
                campaign: true,
                assignedTo: true,
                assignedTeam: true,
                scoringDetails: true,
                enrichment: {
                    include: {
                        contacts: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: Number(limit),
            skip: Number(offset),
        });
        const total = yield index_1.prisma.lead.count({ where });
        res.json({
            leads,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
            },
        });
    }
    catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Create lead
router.post('/', auth_1.authenticateToken, auth_1.requireAnalyst, validation_1.validateLead, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, companyName, domain, industry, campaignId, assignedToId, assignedTeamId } = req.body;
        const lead = yield index_1.prisma.lead.create({
            data: {
                url,
                companyName,
                domain,
                industry,
                campaignId,
                assignedToId,
                assignedTeamId,
            },
            include: {
                campaign: true,
                assignedTo: true,
                assignedTeam: true,
            },
        });
        // Send WebSocket notification
        yield websocketService_1.webSocketService.sendLeadCreated(lead);
        // Send user activity notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, 'created a new lead');
        res.status(201).json({ lead });
    }
    catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get single lead by ID
router.get('/:id', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const lead = yield index_1.prisma.lead.findUnique({
            where: { id },
            include: {
                campaign: true,
                assignedTo: true,
                assignedTeam: true,
                scoringDetails: {
                    include: {
                        criteriaScores: true,
                    },
                },
                enrichment: {
                    include: {
                        contacts: true,
                    },
                },
            },
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json({ lead });
    }
    catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Update lead
router.put('/:id', auth_1.authenticateToken, auth_1.requireAnalyst, validation_1.validateLead, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { url, companyName, domain, industry, campaignId, status, assignedToId, assignedTeamId } = req.body;
        // Get the lead before update to check for assignment changes
        const oldLead = yield index_1.prisma.lead.findUnique({
            where: { id },
            include: { assignedTo: true, assignedTeam: true }
        });
        const lead = yield index_1.prisma.lead.update({
            where: { id },
            data: {
                url,
                companyName,
                domain,
                industry,
                campaignId,
                status,
                assignedToId,
                assignedTeamId,
            },
            include: {
                campaign: true,
                assignedTo: true,
                assignedTeam: true,
            },
        });
        // Send WebSocket notification for lead update
        yield websocketService_1.webSocketService.sendLeadUpdated(lead, req.user.id);
        // Check if lead was assigned to a new user
        if (oldLead && lead.assignedToId && oldLead.assignedToId !== lead.assignedToId) {
            yield websocketService_1.webSocketService.sendLeadAssigned(lead, lead.assignedToId, req.user.id);
        }
        // Send user activity notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, 'updated a lead');
        res.json({ lead });
    }
    catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Enrich lead (using real web scraping)
router.post('/:id/enrich', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        // Get the lead
        const lead = yield index_1.prisma.lead.findUnique({
            where: { id },
            include: { campaign: true }
        });
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        // Remove existing enrichment if any
        yield index_1.prisma.leadEnrichment.deleteMany({ where: { leadId: id } });
        // Scrape the lead's website
        const scrapingResult = yield webScrapingService_1.webScrapingService.scrapeUrl(lead.url, lead.industry);
        if (!scrapingResult.success) {
            return res.status(400).json({
                error: 'Failed to scrape website',
                details: scrapingResult.error
            });
        }
        // Create enrichment with comprehensive scraped data
        const enrichment = yield index_1.prisma.leadEnrichment.create({
            data: {
                leadId: id,
                companySize: Math.floor(Math.random() * 1000) + 10, // Use random for now
                revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`, // Use random for now
                industry: scrapingResult.structuredData.industry || lead.industry,
                technologies: JSON.stringify(scrapingResult.structuredData.technologies || []),
                // Store full scraped content (truncated to fit database)
                scrapedContent: scrapingResult.content.substring(0, 10000), // Limit to 10KB
                pageTitle: scrapingResult.metadata.title,
                pageDescription: scrapingResult.metadata.description,
                pageKeywords: JSON.stringify(scrapingResult.metadata.keywords),
                pageLanguage: scrapingResult.metadata.language,
                lastModified: scrapingResult.metadata.lastModified,
                // Store structured data
                companyName: scrapingResult.structuredData.companyName,
                services: JSON.stringify(scrapingResult.structuredData.services || []),
                certifications: JSON.stringify(scrapingResult.structuredData.certifications || []),
                contactEmail: (_a = scrapingResult.structuredData.contactInfo) === null || _a === void 0 ? void 0 : _a.email,
                contactPhone: (_b = scrapingResult.structuredData.contactInfo) === null || _b === void 0 ? void 0 : _b.phone,
                contactAddress: (_c = scrapingResult.structuredData.contactInfo) === null || _c === void 0 ? void 0 : _c.address,
                // Store scraping metadata
                processingTime: scrapingResult.processingTime,
                scrapingSuccess: scrapingResult.success,
                scrapingError: scrapingResult.error,
                source: 'WEB_SCRAPING',
                // Create contacts if contact info found
                contacts: {
                    create: ((_d = scrapingResult.structuredData.contactInfo) === null || _d === void 0 ? void 0 : _d.email) ? [
                        {
                            name: 'Contact from Website',
                            email: scrapingResult.structuredData.contactInfo.email,
                            title: 'Primary Contact',
                            linkedinUrl: '',
                            isPrimaryContact: true,
                        }
                    ] : []
                }
            },
            include: { contacts: true }
        });
        res.json({ enrichment });
    }
    catch (error) {
        console.error('Enrich lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get enrichment details for a lead
router.get('/:id/enrichment', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const enrichment = yield index_1.prisma.leadEnrichment.findUnique({
            where: { leadId: id },
            include: {
                contacts: true,
                lead: {
                    include: {
                        campaign: true
                    }
                }
            }
        });
        if (!enrichment) {
            return res.status(404).json({ error: 'Enrichment data not found' });
        }
        // Parse JSON fields for easier consumption
        const parsedEnrichment = Object.assign(Object.assign({}, enrichment), { technologies: enrichment.technologies ? JSON.parse(enrichment.technologies) : [], pageKeywords: enrichment.pageKeywords ? JSON.parse(enrichment.pageKeywords) : [], services: enrichment.services ? JSON.parse(enrichment.services) : [], certifications: enrichment.certifications ? JSON.parse(enrichment.certifications) : [] });
        res.json({ enrichment: parsedEnrichment });
    }
    catch (error) {
        console.error('Get enrichment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Bulk operations
router.post('/bulk/status', auth_1.authenticateToken, auth_1.requireAnalyst, validation_1.validateBulkStatusUpdate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadIds, status } = req.body;
        const result = yield index_1.prisma.lead.updateMany({
            where: {
                id: { in: leadIds }
            },
            data: {
                status
            }
        });
        // Send WebSocket notification for bulk status update
        const notification = {
            type: 'lead_updated',
            title: 'Bulk Status Update',
            message: `Updated ${result.count} leads to ${status} status`,
            data: { leadIds, status, updatedCount: result.count },
            timestamp: new Date()
        };
        websocketService_1.webSocketService.sendToAll(notification);
        // Send user activity notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, `updated ${result.count} leads to ${status} status`);
        res.json({
            success: true,
            updatedCount: result.count,
            message: `Updated ${result.count} leads to ${status} status`
        });
    }
    catch (error) {
        console.error('Bulk status update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
router.post('/bulk/score', auth_1.authenticateToken, auth_1.requireAnalyst, validation_1.validateBulkScoring, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadIds, scoringModelId } = req.body;
        let scoredCount = 0;
        let qualifiedCount = 0;
        for (const leadId of leadIds) {
            try {
                const scoringResult = yield scoringService_1.ScoringService.scoreLead(leadId, scoringModelId);
                yield scoringService_1.ScoringService.saveScoringResult(leadId, scoringResult);
                scoredCount++;
                if (scoringResult.totalScore >= 70) {
                    qualifiedCount++;
                }
            }
            catch (error) {
                console.error(`Failed to score lead ${leadId}:`, error);
            }
        }
        // Send WebSocket notification for bulk scoring
        const notification = {
            type: 'lead_scored',
            title: 'Bulk Lead Scoring',
            message: `Scored ${scoredCount} leads, ${qualifiedCount} qualified`,
            data: { leadIds, scoringModelId, scoredCount, qualifiedCount },
            timestamp: new Date()
        };
        websocketService_1.webSocketService.sendToAll(notification);
        // Send user activity notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, `scored ${scoredCount} leads`);
        res.json({
            success: true,
            scoredCount,
            qualifiedCount,
            message: `Scored ${scoredCount} leads, ${qualifiedCount} qualified`
        });
    }
    catch (error) {
        console.error('Bulk scoring error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
router.post('/bulk/enrich', auth_1.authenticateToken, auth_1.requireAnalyst, validation_1.validateBulkEnrichment, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { leadIds } = req.body;
        let enrichedCount = 0;
        for (const leadId of leadIds) {
            try {
                // Check if lead exists
                const lead = yield index_1.prisma.lead.findUnique({ where: { id: leadId } });
                if (!lead) {
                    console.warn(`Lead not found for enrichment: ${leadId}`);
                    continue;
                }
                // Remove existing enrichment if any
                yield index_1.prisma.leadEnrichment.deleteMany({ where: { leadId } });
                // Scrape the lead's website
                const scrapingResult = yield webScrapingService_1.webScrapingService.scrapeUrl(lead.url, lead.industry);
                if (scrapingResult.success) {
                    // Create enrichment with comprehensive scraped data
                    yield index_1.prisma.leadEnrichment.create({
                        data: {
                            leadId,
                            companySize: Math.floor(Math.random() * 1000) + 10, // Use random for now
                            revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`, // Use random for now
                            industry: scrapingResult.structuredData.industry || lead.industry,
                            technologies: JSON.stringify(scrapingResult.structuredData.technologies || []),
                            // Store full scraped content (truncated to fit database)
                            scrapedContent: scrapingResult.content.substring(0, 10000), // Limit to 10KB
                            pageTitle: scrapingResult.metadata.title,
                            pageDescription: scrapingResult.metadata.description,
                            pageKeywords: JSON.stringify(scrapingResult.metadata.keywords),
                            pageLanguage: scrapingResult.metadata.language,
                            lastModified: scrapingResult.metadata.lastModified,
                            // Store structured data
                            companyName: scrapingResult.structuredData.companyName,
                            services: JSON.stringify(scrapingResult.structuredData.services || []),
                            certifications: JSON.stringify(scrapingResult.structuredData.certifications || []),
                            contactEmail: (_a = scrapingResult.structuredData.contactInfo) === null || _a === void 0 ? void 0 : _a.email,
                            contactPhone: (_b = scrapingResult.structuredData.contactInfo) === null || _b === void 0 ? void 0 : _b.phone,
                            contactAddress: (_c = scrapingResult.structuredData.contactInfo) === null || _c === void 0 ? void 0 : _c.address,
                            // Store scraping metadata
                            processingTime: scrapingResult.processingTime,
                            scrapingSuccess: scrapingResult.success,
                            scrapingError: scrapingResult.error,
                            source: 'WEB_SCRAPING',
                            // Create contacts if contact info found
                            contacts: {
                                create: ((_d = scrapingResult.structuredData.contactInfo) === null || _d === void 0 ? void 0 : _d.email) ? [
                                    {
                                        name: 'Contact from Website',
                                        email: scrapingResult.structuredData.contactInfo.email,
                                        title: 'Primary Contact',
                                        linkedinUrl: '',
                                        isPrimaryContact: true,
                                    }
                                ] : []
                            }
                        }
                    });
                    enrichedCount++;
                }
                else {
                    console.warn(`Failed to scrape ${lead.url}: ${scrapingResult.error}`);
                }
            }
            catch (error) {
                console.error(`Failed to enrich lead ${leadId}:`, error);
            }
        }
        // Send WebSocket notification for bulk enrichment
        const notification = {
            type: 'lead_updated',
            title: 'Bulk Lead Enrichment',
            message: `Enriched ${enrichedCount} leads with additional data`,
            data: { leadIds, enrichedCount },
            timestamp: new Date()
        };
        websocketService_1.webSocketService.sendToAll(notification);
        // Send user activity notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, `enriched ${enrichedCount} leads`);
        res.json({
            success: true,
            enrichedCount,
            message: `Enriched ${enrichedCount} leads`
        });
    }
    catch (error) {
        console.error('Bulk enrichment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
router.delete('/bulk', auth_1.authenticateToken, auth_1.requireAnalyst, validation_1.validateBulkDelete, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { leadIds } = req.body;
        const result = yield index_1.prisma.lead.deleteMany({
            where: {
                id: { in: leadIds }
            }
        });
        res.json({
            success: true,
            deletedCount: result.count,
            message: `Deleted ${result.count} leads`
        });
    }
    catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Import leads from CSV
router.post('/import', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const file = req.files.file;
        const campaignId = req.body.campaignId;
        if (!campaignId) {
            return res.status(400).json({ error: 'Campaign ID is required' });
        }
        // Verify campaign exists
        const campaign = yield index_1.prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!campaign) {
            return res.status(400).json({ error: 'Campaign not found' });
        }
        const csvContent = file.data.toString();
        const lines = csvContent.split('\n');
        const headers = ((_a = lines[0]) === null || _a === void 0 ? void 0 : _a.split(',').map((h) => h.trim())) || [];
        const results = {
            total: 0,
            success: 0,
            errors: []
        };
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            results.total++;
            const values = line.split(',').map((v) => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            try {
                // Validate required fields
                if (!row.url || !row.companyName || !row.domain) {
                    results.errors.push({
                        row: i + 1,
                        field: 'required',
                        message: 'Missing required fields: url, companyName, domain'
                    });
                    continue;
                }
                // Create lead
                yield index_1.prisma.lead.create({
                    data: {
                        url: row.url,
                        companyName: row.companyName,
                        domain: row.domain,
                        industry: row.industry || 'Unknown',
                        campaignId: campaignId,
                        status: 'RAW'
                    }
                });
                results.success++;
            }
            catch (error) {
                results.errors.push({
                    row: i + 1,
                    field: 'general',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        res.json(Object.assign(Object.assign({}, results), { success: true }));
    }
    catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Export leads
router.post('/export', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { format = 'csv', includeEnrichment = true, includeScoring = true, filters = {} } = req.body;
        // Build where clause from filters
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.campaignId)
            where.campaignId = filters.campaignId;
        if (filters.assignedToId)
            where.assignedToId = filters.assignedToId;
        if (filters.assignedTeamId)
            where.assignedTeamId = filters.assignedTeamId;
        if (filters.industry)
            where.industry = filters.industry;
        const leads = yield index_1.prisma.lead.findMany({
            where,
            include: {
                campaign: true,
                assignedTo: true,
                assignedTeam: true,
                enrichment: includeEnrichment,
                scoringDetails: includeScoring ? {
                    include: {
                        criteriaScores: true
                    }
                } : false
            },
            orderBy: { createdAt: 'desc' }
        });
        if (format === 'csv') {
            const csvHeaders = [
                'id', 'url', 'companyName', 'domain', 'industry', 'status', 'score',
                'campaignName', 'assignedTo', 'assignedTeam', 'createdAt', 'lastScoredAt'
            ];
            if (includeEnrichment) {
                csvHeaders.push('companySize', 'revenue', 'technologies');
            }
            if (includeScoring) {
                csvHeaders.push('totalScore', 'confidence', 'scoringModelVersion');
            }
            let csvContent = csvHeaders.join(',') + '\n';
            leads.forEach(lead => {
                var _a, _b, _c, _d, _e;
                const row = [
                    lead.id,
                    lead.url,
                    lead.companyName,
                    lead.domain,
                    lead.industry,
                    lead.status,
                    lead.score || '',
                    ((_a = lead.campaign) === null || _a === void 0 ? void 0 : _a.name) || '',
                    ((_b = lead.assignedTo) === null || _b === void 0 ? void 0 : _b.fullName) || '',
                    ((_c = lead.assignedTeam) === null || _c === void 0 ? void 0 : _c.name) || '',
                    lead.createdAt.toISOString(),
                    ((_d = lead.lastScoredAt) === null || _d === void 0 ? void 0 : _d.toISOString()) || ''
                ];
                if (includeEnrichment && lead.enrichment) {
                    row.push(((_e = lead.enrichment.companySize) === null || _e === void 0 ? void 0 : _e.toString()) || '', lead.enrichment.revenue || '', lead.enrichment.technologies || '');
                }
                if (includeScoring && lead.scoringDetails) {
                    row.push(lead.scoringDetails.totalScore.toString(), lead.scoringDetails.confidence.toString(), lead.scoringDetails.scoringModelVersion);
                }
                csvContent += row.map(field => `"${field}"`).join(',') + '\n';
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        }
        else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.json"`);
            res.json(leads);
        }
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Automated pipeline: Process URLs through complete workflow
router.post('/pipeline', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { urls, campaignId, industry } = req.body;
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'URLs array is required and must not be empty' });
        }
        if (!campaignId) {
            return res.status(400).json({ error: 'Campaign ID is required' });
        }
        // Validate campaign exists and has a scoring model
        const campaign = yield index_1.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { scoringModel: true }
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        if (!campaign.scoringModel) {
            return res.status(400).json({
                error: 'Campaign must have a scoring model assigned before running pipeline'
            });
        }
        // Validate URLs
        const validUrls = urls.filter(url => {
            try {
                new URL(url);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
        if (validUrls.length === 0) {
            return res.status(400).json({ error: 'No valid URLs provided' });
        }
        if (validUrls.length !== urls.length) {
            console.warn(`Filtered out ${urls.length - validUrls.length} invalid URLs`);
        }
        // Start the pipeline (this runs asynchronously)
        const pipelineJob = yield pipelineService_1.PipelineService.processUrls(validUrls, campaignId, industry);
        // Send user activity notification
        yield websocketService_1.webSocketService.sendUserActivity(req.user.id, `started pipeline for ${validUrls.length} URLs`);
        res.json({
            success: true,
            jobId: pipelineJob.id,
            message: `Pipeline started for ${validUrls.length} URLs`,
            campaign: {
                id: campaign.id,
                name: campaign.name,
                scoringModel: {
                    id: campaign.scoringModel.id,
                    name: campaign.scoringModel.name
                }
            },
            urls: validUrls,
            industry: industry || 'Auto-detected'
        });
    }
    catch (error) {
        console.error('Pipeline error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get pipeline job status
router.get('/pipeline/:jobId', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const job = yield pipelineService_1.PipelineService.getJobStatus(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Pipeline job not found' });
        }
        res.json({ job });
    }
    catch (error) {
        console.error('Get pipeline job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get campaign pipeline jobs
router.get('/campaign/:campaignId/pipeline', auth_1.authenticateToken, auth_1.requireAnalyst, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { campaignId } = req.params;
        const jobs = yield pipelineService_1.PipelineService.getCampaignJobs(campaignId);
        res.json({ jobs });
    }
    catch (error) {
        console.error('Get campaign pipeline jobs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
