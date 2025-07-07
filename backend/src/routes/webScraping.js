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
const webScrapingService_1 = require("../services/webScrapingService");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
/**
 * POST /api/web-scraping/scrape
 * Scrape a single URL
 */
router.post('/scrape', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, industry } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        const result = yield webScrapingService_1.webScrapingService.scrapeUrl(url, industry);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error scraping URL:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to scrape URL'
        });
    }
}));
/**
 * POST /api/web-scraping/batch
 * Scrape multiple URLs in batch
 */
router.post('/batch', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { urls, industry } = req.body;
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'URLs array is required and must not be empty'
            });
        }
        if (urls.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 URLs allowed per batch'
            });
        }
        const job = yield webScrapingService_1.webScrapingService.scrapeBatch(urls, industry);
        res.json({
            success: true,
            data: job
        });
    }
    catch (error) {
        console.error('Error in batch scraping:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process batch scraping'
        });
    }
}));
/**
 * GET /api/web-scraping/stats
 * Get scraping statistics
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield webScrapingService_1.webScrapingService.getScrapingStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting scraping stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get scraping statistics'
        });
    }
}));
/**
 * POST /api/web-scraping/check-accessibility
 * Check if a URL is accessible
 */
router.post('/check-accessibility', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        const isAccessible = yield webScrapingService_1.webScrapingService.checkUrlAccessibility(url);
        res.json({
            success: true,
            data: {
                url,
                isAccessible
            }
        });
    }
    catch (error) {
        console.error('Error checking URL accessibility:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check URL accessibility'
        });
    }
}));
/**
 * GET /api/web-scraping/health
 * Health check for web scraping service
 */
router.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Test with a simple URL to verify service is working
        const testUrl = 'https://httpbin.org/html';
        const result = yield webScrapingService_1.webScrapingService.scrapeUrl(testUrl);
        res.json({
            success: true,
            data: {
                status: 'healthy',
                testUrl,
                testResult: result.success
            }
        });
    }
    catch (error) {
        console.error('Web scraping health check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Web scraping service is unhealthy'
        });
    }
}));
exports.default = router;
