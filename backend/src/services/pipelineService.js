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
exports.PipelineService = void 0;
const index_1 = require("../index");
const webScrapingService_1 = require("./webScrapingService");
const scoringService_1 = require("./scoringService");
const websocketService_1 = require("./websocketService");
class PipelineService {
    /**
     * Process a list of URLs through the complete pipeline
     */
    static processUrls(urls, campaignId, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            const jobId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const job = {
                id: jobId,
                campaignId,
                urls,
                status: 'pending',
                progress: {
                    total: urls.length,
                    processed: 0,
                    scraped: 0,
                    scored: 0,
                    qualified: 0
                },
                results: [],
                createdAt: new Date()
            };
            try {
                // Get campaign and scoring model
                const campaign = yield index_1.prisma.campaign.findUnique({
                    where: { id: campaignId },
                    include: { scoringModel: true }
                });
                if (!campaign) {
                    throw new Error('Campaign not found');
                }
                if (!campaign.scoringModel) {
                    throw new Error('Campaign must have a scoring model assigned');
                }
                job.status = 'running';
                job.startedAt = new Date();
                // Send initial notification
                yield websocketService_1.webSocketService.sendPipelineNotification('pipeline_started', 'Pipeline Started', `Processing ${urls.length} URLs for campaign: ${campaign.name}`, { jobId, campaignId, totalUrls: urls.length });
                // Process each URL
                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i];
                    try {
                        // Step 1: Create lead
                        const lead = yield this.createLeadFromUrl(url, campaignId, industry);
                        job.progress.processed++;
                        // Step 2: Scrape and enrich
                        const enrichment = yield this.scrapeAndEnrich(lead.id, url, industry);
                        if (enrichment) {
                            job.progress.scraped++;
                        }
                        // Step 3: Score the lead
                        const scoringResult = yield scoringService_1.ScoringService.scoreLead(lead.id, campaign.scoringModel.id);
                        yield scoringService_1.ScoringService.saveScoringResult(lead.id, scoringResult);
                        job.progress.scored++;
                        if (scoringResult.totalScore >= 70) {
                            job.progress.qualified++;
                        }
                        // Add to results
                        job.results.push({
                            url,
                            leadId: lead.id,
                            status: 'success',
                            score: scoringResult.totalScore,
                            qualified: scoringResult.totalScore >= 70
                        });
                    }
                    catch (error) {
                        console.error(`Failed to process URL ${url}:`, error);
                        job.results.push({
                            url,
                            status: 'failed',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    // Update progress notification
                    yield websocketService_1.webSocketService.sendPipelineNotification('pipeline_progress', 'Pipeline Progress', `Processed ${job.progress.processed}/${job.progress.total} URLs`, {
                        jobId,
                        progress: job.progress,
                        currentUrl: url,
                        currentIndex: i + 1
                    });
                }
                job.status = 'completed';
                job.completedAt = new Date();
                // Send completion notification
                yield websocketService_1.webSocketService.sendPipelineNotification('pipeline_completed', 'Pipeline Completed', `Successfully processed ${job.progress.processed} URLs. ${job.progress.qualified} leads qualified.`, {
                    jobId,
                    results: job.results,
                    summary: job.progress
                });
            }
            catch (error) {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : 'Unknown error';
                job.completedAt = new Date();
                // Send failure notification
                yield websocketService_1.webSocketService.sendPipelineNotification('pipeline_failed', 'Pipeline Failed', `Pipeline failed: ${job.error}`, { jobId, error: job.error });
            }
            return job;
        });
    }
    /**
     * Create a lead from a URL
     */
    static createLeadFromUrl(url, campaignId, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            // Extract domain from URL
            const domain = new URL(url).hostname;
            // Create basic lead
            const lead = yield index_1.prisma.lead.create({
                data: {
                    url,
                    companyName: domain, // Will be updated during enrichment
                    domain,
                    industry: industry || 'Unknown',
                    campaignId,
                    status: 'RAW'
                }
            });
            return lead;
        });
    }
    /**
     * Scrape and enrich a lead
     */
    static scrapeAndEnrich(leadId, url, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // Remove existing enrichment if any
                yield index_1.prisma.leadEnrichment.deleteMany({ where: { leadId } });
                // Scrape the website
                const scrapingResult = yield webScrapingService_1.webScrapingService.scrapeUrl(url, industry);
                if (!scrapingResult.success) {
                    throw new Error(`Failed to scrape ${url}: ${scrapingResult.error}`);
                }
                // Create enrichment with comprehensive scraped data
                const enrichment = yield index_1.prisma.leadEnrichment.create({
                    data: {
                        leadId,
                        companySize: Math.floor(Math.random() * 1000) + 10, // Use random for now
                        revenue: `$${(Math.floor(Math.random() * 100) + 1)}M`, // Use random for now
                        industry: scrapingResult.structuredData.industry || industry || 'Unknown',
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
                // Update lead with company name if found
                if (scrapingResult.structuredData.companyName) {
                    yield index_1.prisma.lead.update({
                        where: { id: leadId },
                        data: { companyName: scrapingResult.structuredData.companyName }
                    });
                }
                return enrichment;
            }
            catch (error) {
                console.error(`Failed to enrich lead ${leadId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Get pipeline job status
     */
    static getJobStatus(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            // For now, we'll return null since we're not persisting jobs
            // In a production system, you'd want to store jobs in the database
            return null;
        });
    }
    /**
     * Get all pipeline jobs for a campaign
     */
    static getCampaignJobs(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            // For now, return empty array since we're not persisting jobs
            // In a production system, you'd query the database
            return [];
        });
    }
}
exports.PipelineService = PipelineService;
