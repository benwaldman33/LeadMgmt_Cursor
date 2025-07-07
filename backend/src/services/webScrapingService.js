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
exports.webScrapingService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class WebScrapingService {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
        ];
        this.rateLimits = new Map();
        this.maxRequestsPerMinute = 60;
        this.maxConcurrentRequests = 10;
        this.activeRequests = 0;
        // Initialize rate limiting
        setInterval(() => this.resetRateLimits(), 60000);
    }
    /**
     * Scrape a single URL with comprehensive content extraction
     */
    scrapeUrl(url, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                // Check rate limiting
                yield this.checkRateLimit(url);
                // Validate URL
                const normalizedUrl = this.normalizeUrl(url);
                // Get random user agent
                const userAgent = this.getRandomUserAgent();
                // Make request with timeout and retry logic
                const response = yield this.makeRequest(normalizedUrl, userAgent);
                // Parse content
                const $ = cheerio.load(response.data);
                // Extract content
                const content = this.extractContent($);
                const metadata = this.extractMetadata($);
                const structuredData = this.extractStructuredData($, industry);
                const processingTime = Date.now() - startTime;
                // Log successful scrape
                yield this.logScrapingActivity(url, 'success', processingTime);
                return {
                    url: normalizedUrl,
                    success: true,
                    content,
                    metadata,
                    structuredData,
                    timestamp: new Date(),
                    processingTime
                };
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                // Log failed scrape
                yield this.logScrapingActivity(url, 'failed', processingTime, errorMessage);
                return {
                    url: this.normalizeUrl(url),
                    success: false,
                    content: '',
                    metadata: {
                        title: '',
                        description: '',
                        keywords: [],
                        language: 'en'
                    },
                    structuredData: {},
                    error: errorMessage,
                    timestamp: new Date(),
                    processingTime
                };
            }
        });
    }
    /**
     * Scrape multiple URLs in batch with industry-specific processing
     */
    scrapeBatch(urls, industry) {
        return __awaiter(this, void 0, void 0, function* () {
            const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const job = {
                id: jobId,
                urls,
                industry: industry || 'general',
                status: 'pending',
                results: [],
                createdAt: new Date()
            };
            try {
                job.status = 'running';
                // Process URLs in batches to respect rate limits
                const batchSize = 5;
                const results = [];
                for (let i = 0; i < urls.length; i += batchSize) {
                    const batch = urls.slice(i, i + batchSize);
                    // Process batch concurrently with rate limiting
                    const batchPromises = batch.map(url => this.scrapeUrl(url, industry));
                    const batchResults = yield Promise.allSettled(batchPromises);
                    // Process results
                    batchResults.forEach((result, index) => {
                        var _a;
                        if (result.status === 'fulfilled') {
                            results.push(result.value);
                        }
                        else {
                            results.push({
                                url: batch[index],
                                success: false,
                                content: '',
                                metadata: {
                                    title: '',
                                    description: '',
                                    keywords: [],
                                    language: 'en'
                                },
                                structuredData: {},
                                error: ((_a = result.reason) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error',
                                timestamp: new Date(),
                                processingTime: 0
                            });
                        }
                    });
                    // Add delay between batches to respect rate limits
                    if (i + batchSize < urls.length) {
                        yield this.delay(2000);
                    }
                }
                job.results = results;
                job.status = 'completed';
                job.completedAt = new Date();
            }
            catch (error) {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : 'Unknown error';
                job.completedAt = new Date();
            }
            return job;
        });
    }
    /**
     * Extract main content from HTML
     */
    extractContent($) {
        // Remove script and style elements
        $('script, style, noscript').remove();
        // Extract text from main content areas
        const contentSelectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '#main',
            'body'
        ];
        let content = '';
        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text().trim();
                if (content.length > 100)
                    break; // Found substantial content
            }
        }
        // Clean and normalize content
        return this.cleanContent(content);
    }
    /**
     * Extract metadata from HTML
     */
    extractMetadata($) {
        var _a;
        const title = $('title').text().trim() || $('h1').first().text().trim();
        const description = $('meta[name="description"]').attr('content') || '';
        const keywords = ((_a = $('meta[name="keywords"]').attr('content')) === null || _a === void 0 ? void 0 : _a.split(',').map((k) => k.trim())) || [];
        const language = $('html').attr('lang') || 'en';
        const lastModified = $('meta[http-equiv="last-modified"]').attr('content');
        return {
            title,
            description,
            keywords,
            language,
            lastModified
        };
    }
    /**
     * Extract structured data based on industry patterns
     */
    extractStructuredData($, industry) {
        const structuredData = {};
        // Extract company name
        const companyNameSelectors = [
            '.company-name',
            '.brand',
            '.logo-text',
            'h1',
            '.site-title'
        ];
        for (const selector of companyNameSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                structuredData.companyName = element.text().trim();
                break;
            }
        }
        // Extract contact information
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const phonePattern = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
        const bodyText = $('body').text();
        const emails = bodyText.match(emailPattern) || [];
        const phones = bodyText.match(phonePattern) || [];
        if (emails.length > 0) {
            structuredData.contactInfo = Object.assign(Object.assign({}, structuredData.contactInfo), { email: emails[0] });
        }
        if (phones.length > 0) {
            structuredData.contactInfo = Object.assign(Object.assign({}, structuredData.contactInfo), { phone: phones[0] });
        }
        // Industry-specific extraction
        if (industry) {
            structuredData.industry = industry;
            structuredData.services = this.extractIndustryServices($, industry);
            structuredData.technologies = this.extractTechnologies($, industry);
            structuredData.certifications = this.extractCertifications($, industry);
        }
        return structuredData;
    }
    /**
     * Extract industry-specific services
     */
    extractIndustryServices($, industry) {
        const services = [];
        // Common service indicators
        const serviceSelectors = [
            '.services',
            '.what-we-do',
            '.offerings',
            '.products',
            '.solutions'
        ];
        for (const selector of serviceSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                const serviceText = element.text().toLowerCase();
                const serviceWords = serviceText.split(/\s+/);
                services.push(...serviceWords.filter((word) => word.length > 3));
            }
        }
        return [...new Set(services)].slice(0, 10); // Limit to 10 unique services
    }
    /**
     * Extract technology mentions
     */
    extractTechnologies($, industry) {
        const technologies = [];
        const bodyText = $('body').text().toLowerCase();
        // Technology keywords by industry
        const techKeywords = {
            'dental': ['cbct', 'scanner', 'laser', 'implant', 'restorative', 'intraoral'],
            'construction': ['crane', 'excavator', 'bulldozer', 'loader', 'backhoe'],
            'manufacturing': ['automation', 'robotics', 'cnc', 'plc', 'scada'],
            'retail': ['pos', 'ecommerce', 'inventory', 'crm', 'analytics'],
            'warehouse': ['wms', 'automation', 'conveyor', 'racking', 'forklift']
        };
        const industryTechs = techKeywords[industry] || [];
        for (const tech of industryTechs) {
            if (bodyText.includes(tech)) {
                technologies.push(tech);
            }
        }
        return technologies;
    }
    /**
     * Extract certifications and credentials
     */
    extractCertifications($, industry) {
        const certifications = [];
        const bodyText = $('body').text().toLowerCase();
        // Certification patterns
        const certPatterns = [
            /iso\s*\d{4}/gi,
            /certified/gi,
            /licensed/gi,
            /accredited/gi,
            /approved/gi
        ];
        for (const pattern of certPatterns) {
            const matches = bodyText.match(pattern);
            if (matches) {
                certifications.push(...matches);
            }
        }
        return [...new Set(certifications)];
    }
    /**
     * Clean and normalize content
     */
    cleanContent(content) {
        return content
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim()
            .substring(0, 10000); // Limit content length
    }
    /**
     * Normalize URL
     */
    normalizeUrl(url) {
        let normalized = url.trim();
        // Add protocol if missing
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = 'https://' + normalized;
        }
        // Remove trailing slash
        if (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }
    /**
     * Make HTTP request with retry logic
     */
    makeRequest(url, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const maxRetries = 3;
            let lastError = null;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = yield axios_1.default.get(url, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': userAgent,
                        },
                    });
                    return response;
                }
                catch (error) {
                    lastError = error;
                    // Don't retry on certain errors
                    if (error && typeof error === 'object' && 'response' in error) {
                        const axiosError = error;
                        if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 404 || ((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.status) === 403) {
                            throw new Error('Page not accessible');
                        }
                    }
                    // Wait before retry
                    if (attempt < maxRetries) {
                        yield this.delay(1000 * attempt);
                    }
                }
            }
            throw lastError || new Error('Request failed after all retries');
        });
    }
    /**
     * Check and enforce rate limiting
     */
    checkRateLimit(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const domain = new URL(url).hostname;
            const now = Date.now();
            const rateLimit = this.rateLimits.get(domain);
            if (rateLimit) {
                if (now < rateLimit.resetTime && rateLimit.requests >= this.maxRequestsPerMinute) {
                    const waitTime = rateLimit.resetTime - now;
                    yield this.delay(waitTime);
                }
                if (now >= rateLimit.resetTime) {
                    rateLimit.requests = 1;
                    rateLimit.resetTime = now + 60000;
                }
                else {
                    rateLimit.requests++;
                }
            }
            else {
                this.rateLimits.set(domain, {
                    requests: 1,
                    resetTime: now + 60000
                });
            }
        });
    }
    /**
     * Reset rate limits
     */
    resetRateLimits() {
        const now = Date.now();
        for (const [domain, rateLimit] of this.rateLimits.entries()) {
            if (now >= rateLimit.resetTime) {
                this.rateLimits.delete(domain);
            }
        }
    }
    /**
     * Get random user agent
     */
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Log scraping activity
     */
    logScrapingActivity(url, status, processingTime, error) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.auditLog.create({
                    data: {
                        action: 'WEB_SCRAPING',
                        entityType: 'URL',
                        entityId: url,
                        description: `Web scraping ${status} for ${url}`,
                        metadata: JSON.stringify({
                            processingTime: processingTime,
                            error: error,
                            timestamp: new Date(),
                        }),
                        userId: null // System activity, no specific user
                    }
                });
            }
            catch (error) {
                console.error('Failed to log scraping activity:', error);
            }
        });
    }
    /**
     * Get scraping statistics
     */
    getScrapingStats() {
        return __awaiter(this, void 0, void 0, function* () {
            // This would query the database for actual statistics
            // For now, return mock data
            return {
                totalUrls: 0,
                successfulScrapes: 0,
                failedScrapes: 0,
                averageProcessingTime: 0,
                industryBreakdown: {}
            };
        });
    }
    /**
     * Check if URL is accessible
     */
    checkUrlAccessibility(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(url, {
                    timeout: 5000,
                });
                return response.status >= 200 && response.status < 400;
            }
            catch (_a) {
                return false;
            }
        });
    }
}
exports.webScrapingService = new WebScrapingService();
