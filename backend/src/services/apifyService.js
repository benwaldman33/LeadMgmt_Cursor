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
exports.apifyService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const auditLogService_1 = require("./auditLogService");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
class ApifyService {
    constructor() {
        this.baseUrl = 'https://api.apify.com/v2';
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production';
    }
    /**
     * Encrypt sensitive data
     */
    encrypt(text) {
        const algorithm = 'aes-256-cbc';
        const key = crypto_1.default.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText) {
        const algorithm = 'aes-256-cbc';
        const key = crypto_1.default.scryptSync(this.encryptionKey, 'salt', 32);
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * Create a new Apify Actor configuration
     */
    createActorConfig(config, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const encryptedToken = this.encrypt(config.apiToken);
            const actorConfig = yield prisma.apifyActor.create({
                data: {
                    name: config.name,
                    description: config.description,
                    actorId: config.actorId,
                    apiToken: encryptedToken,
                    isActive: config.isActive,
                    defaultInput: config.defaultInput ? JSON.stringify(config.defaultInput) : null,
                    createdById: userId
                }
            });
            return Object.assign(Object.assign({}, actorConfig), { description: actorConfig.description || undefined, apiToken: config.apiToken, defaultInput: actorConfig.defaultInput ? JSON.parse(actorConfig.defaultInput) : undefined });
        });
    }
    /**
     * Get all configured Apify Actors
     */
    getActorConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            const actors = yield prisma.apifyActor.findMany({
                where: { isActive: true },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return actors.map((actor) => ({
                id: actor.id,
                name: actor.name,
                description: actor.description || undefined,
                actorId: actor.actorId,
                apiToken: this.decrypt(actor.apiToken),
                isActive: actor.isActive,
                defaultInput: actor.defaultInput ? JSON.parse(actor.defaultInput) : undefined,
                createdAt: actor.createdAt,
                updatedAt: actor.updatedAt
            }));
        });
    }
    /**
     * Get actor configuration by ID
     */
    getActorConfig(actorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const actor = yield prisma.apifyActor.findUnique({
                where: { id: actorId },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                }
            });
            if (!actor)
                return null;
            return {
                id: actor.id,
                name: actor.name,
                description: actor.description || undefined,
                actorId: actor.actorId,
                apiToken: this.decrypt(actor.apiToken),
                isActive: actor.isActive,
                defaultInput: actor.defaultInput ? JSON.parse(actor.defaultInput) : undefined,
                createdAt: actor.createdAt,
                updatedAt: actor.updatedAt
            };
        });
    }
    /**
     * Run an Apify Actor with the given input
     */
    runActor(actorId_1) {
        return __awaiter(this, arguments, void 0, function* (actorId, input = {}) {
            try {
                // Get actor config
                const config = yield this.getActorConfig(actorId);
                if (!config) {
                    throw new Error(`Actor configuration not found for ID: ${actorId}`);
                }
                // Start the actor run
                const response = yield axios_1.default.post(`${this.baseUrl}/acts/${config.actorId}/runs?token=${config.apiToken}`, Object.assign(Object.assign({}, config.defaultInput), input), {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const responseData = response.data;
                const runResult = {
                    id: responseData.data.id,
                    actorId: config.actorId,
                    status: responseData.data.status,
                    startedAt: responseData.data.startedAt,
                    progress: responseData.data.progress
                };
                // Log the activity
                yield auditLogService_1.AuditLogService.logActivity({
                    userId: 'system',
                    action: 'apify_actor_run_started',
                    entityType: 'apify_actor',
                    entityId: actorId,
                    description: `Started Apify Actor run: ${config.name}`,
                    metadata: {
                        runId: runResult.id,
                        input,
                        actorName: config.name
                    }
                });
                return runResult;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                yield auditLogService_1.AuditLogService.logActivity({
                    userId: 'system',
                    action: 'apify_actor_run_failed',
                    entityType: 'apify_actor',
                    entityId: actorId,
                    description: `Failed to run Apify Actor: ${errorMessage}`,
                    metadata: {
                        error: errorMessage,
                        input
                    }
                });
                throw new Error(`Failed to run Apify Actor: ${errorMessage}`);
            }
        });
    }
    /**
     * Get the status and results of an Apify run
     */
    getRunStatus(runId, actorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield this.getActorConfig(actorId);
                if (!config) {
                    throw new Error(`Actor configuration not found for ID: ${actorId}`);
                }
                const response = yield axios_1.default.get(`${this.baseUrl}/acts/${config.actorId}/runs/${runId}?token=${config.apiToken}`);
                const responseData = response.data;
                const runResult = {
                    id: responseData.id,
                    actorId: config.actorId,
                    status: responseData.status,
                    startedAt: responseData.startedAt,
                    finishedAt: responseData.finishedAt,
                    output: responseData.output,
                    error: responseData.error,
                    progress: responseData.progress
                };
                return runResult;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to get run status: ${errorMessage}`);
            }
        });
    }
    /**
     * Scrape URLs using an Apify Actor
     */
    scrapeWithActor(actorId, urls, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            const jobId = `apify_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Create job record in database
            const jobRecord = yield prisma.apifyScrapingJob.create({
                data: {
                    id: jobId,
                    actorId,
                    urls: JSON.stringify(urls),
                    industry: industry || 'general',
                    status: 'pending'
                }
            });
            const job = {
                id: jobRecord.id,
                actorId,
                urls,
                industry: industry || 'general',
                status: 'pending',
                results: [],
                createdAt: jobRecord.createdAt
            };
            try {
                // Update job status to running
                yield prisma.apifyScrapingJob.update({
                    where: { id: jobId },
                    data: { status: 'running' }
                });
                job.status = 'running';
                // Run the Apify Actor
                const runResult = yield this.runActor(actorId, {
                    urls,
                    industry,
                    maxRequestsPerCrawl: urls.length,
                    maxConcurrency: 5
                });
                job.apifyRunId = runResult.id;
                // Update job with run ID
                yield prisma.apifyScrapingJob.update({
                    where: { id: jobId },
                    data: { apifyRunId: runResult.id }
                });
                // Wait for completion and get results
                const finalResult = yield this.waitForCompletion(runResult.id, actorId);
                if (finalResult.status === 'SUCCEEDED' && finalResult.output) {
                    job.results = this.processApifyOutput(finalResult.output, urls, industry);
                    job.status = 'completed';
                    // Update job with results
                    yield prisma.apifyScrapingJob.update({
                        where: { id: jobId },
                        data: {
                            status: 'completed',
                            results: JSON.stringify(job.results),
                            completedAt: new Date()
                        }
                    });
                }
                else {
                    job.status = 'failed';
                    job.error = finalResult.error || 'Apify Actor failed to complete';
                    // Update job with error
                    yield prisma.apifyScrapingJob.update({
                        where: { id: jobId },
                        data: {
                            status: 'failed',
                            error: job.error,
                            completedAt: new Date()
                        }
                    });
                }
                job.completedAt = new Date();
            }
            catch (error) {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : 'Unknown error';
                job.completedAt = new Date();
                // Update job with error
                yield prisma.apifyScrapingJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'failed',
                        error: job.error,
                        completedAt: new Date()
                    }
                });
            }
            return job;
        });
    }
    /**
     * Get scraping job by ID
     */
    getScrapingJob(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const jobRecord = yield prisma.apifyScrapingJob.findUnique({
                where: { id: jobId }
            });
            if (!jobRecord)
                return null;
            return {
                id: jobRecord.id,
                actorId: jobRecord.actorId,
                urls: JSON.parse(jobRecord.urls),
                industry: jobRecord.industry,
                status: jobRecord.status,
                results: jobRecord.results ? JSON.parse(jobRecord.results) : [],
                createdAt: jobRecord.createdAt,
                completedAt: jobRecord.completedAt || undefined,
                error: jobRecord.error || undefined,
                apifyRunId: jobRecord.apifyRunId || undefined
            };
        });
    }
    /**
     * Wait for an Apify run to complete
     */
    waitForCompletion(runId_1, actorId_1) {
        return __awaiter(this, arguments, void 0, function* (runId, actorId, maxWaitTime = 300000) {
            const startTime = Date.now();
            const checkInterval = 5000; // Check every 5 seconds
            while (Date.now() - startTime < maxWaitTime) {
                const result = yield this.getRunStatus(runId, actorId);
                if (result.status === 'SUCCEEDED' || result.status === 'FAILED' || result.status === 'ABORTED' || result.status === 'TIMED-OUT') {
                    return result;
                }
                // Wait before checking again
                yield new Promise(resolve => setTimeout(resolve, checkInterval));
            }
            throw new Error('Apify run timed out');
        });
    }
    /**
     * Process Apify output into standardized scraping results
     */
    processApifyOutput(output, urls, industry) {
        const results = [];
        // Handle different output formats from Apify Actors
        if (Array.isArray(output)) {
            // If output is an array of results
            for (const item of output) {
                const result = this.transformApifyItem(item, industry);
                if (result) {
                    results.push(result);
                }
            }
        }
        else if (output.results && Array.isArray(output.results)) {
            // If output has a results array
            for (const item of output.results) {
                const result = this.transformApifyItem(item, industry);
                if (result) {
                    results.push(result);
                }
            }
        }
        else if (typeof output === 'object') {
            // If output is a single object
            const result = this.transformApifyItem(output, industry);
            if (result) {
                results.push(result);
            }
        }
        return results;
    }
    /**
     * Transform a single Apify item into a standardized scraping result
     */
    transformApifyItem(item, industry) {
        try {
            const url = item.url || item.website || item.link || '';
            if (!url)
                return null;
            const content = item.content || item.text || item.body || item.html || '';
            const title = item.title || item.pageTitle || '';
            const description = item.description || item.metaDescription || '';
            // Extract keywords
            const keywords = item.keywords || item.metaKeywords || [];
            const keywordsArray = Array.isArray(keywords) ? keywords : keywords.split(',').map((k) => k.trim());
            // Extract contact information
            const contactInfo = {
                email: item.email || item.contactEmail || '',
                phone: item.phone || item.contactPhone || '',
                address: item.address || item.contactAddress || ''
            };
            // Extract structured data
            const structuredData = {
                companyName: item.companyName || item.company || item.businessName || '',
                industry: industry || item.industry || '',
                services: item.services || item.products || [],
                technologies: item.technologies || item.tech || [],
                certifications: item.certifications || item.certs || [],
                contactInfo
            };
            return {
                url,
                success: true,
                content: content.substring(0, 10000), // Limit content size
                metadata: {
                    title,
                    description,
                    keywords: keywordsArray,
                    language: item.language || 'en',
                    lastModified: item.lastModified || item.updatedAt
                },
                structuredData,
                timestamp: new Date(),
                processingTime: item.processingTime || 0,
                source: 'apify',
                actorId: item.actorId || ''
            };
        }
        catch (error) {
            console.error('Error transforming Apify item:', error);
            return null;
        }
    }
    /**
     * Test Apify Actor configuration
     */
    testActorConfig(actorId, apiToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/acts/${actorId}?token=${apiToken}`);
                return response.status === 200;
            }
            catch (error) {
                return false;
            }
        });
    }
}
exports.apifyService = new ApifyService();
