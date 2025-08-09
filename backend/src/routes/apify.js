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
const apifyService_1 = require("../services/apifyService");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(auth_1.default);
/**
 * GET /api/apify/actors
 * Get all configured Apify Actors
 */
router.get('/actors', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actors = yield apifyService_1.apifyService.getActorConfigs();
        res.json({
            success: true,
            data: actors
        });
    }
    catch (error) {
        console.error('Error fetching Apify actors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Apify actors'
        });
    }
}));
/**
 * POST /api/apify/actors
 * Create a new Apify Actor configuration
 */
router.post('/actors', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, actorId, apiToken, isActive, defaultInput } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        if (!name || !actorId || !apiToken) {
            return res.status(400).json({
                success: false,
                error: 'Name, actorId, and apiToken are required'
            });
        }
        const actorConfig = yield apifyService_1.apifyService.createActorConfig({
            name,
            description,
            actorId,
            apiToken,
            isActive: isActive !== null && isActive !== void 0 ? isActive : true,
            defaultInput: defaultInput || {}
        }, userId);
        res.json({
            success: true,
            data: actorConfig
        });
    }
    catch (error) {
        console.error('Error creating Apify actor config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create Apify actor configuration'
        });
    }
}));
/**
 * POST /api/apify/test
 * Test an Apify Actor configuration
 */
router.post('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { actorId, apiToken } = req.body;
        if (!actorId || !apiToken) {
            return res.status(400).json({
                success: false,
                error: 'actorId and apiToken are required'
            });
        }
        const isValid = yield apifyService_1.apifyService.testActorConfig(actorId, apiToken);
        res.json({
            success: true,
            data: { isValid }
        });
    }
    catch (error) {
        console.error('Error testing Apify actor config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test Apify actor configuration'
        });
    }
}));
/**
 * POST /api/apify/scrape
 * Scrape URLs using an Apify Actor
 */
router.post('/scrape', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { actorId, urls, industry } = req.body;
        if (!actorId || !urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'actorId and urls array are required'
            });
        }
        if (urls.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 URLs allowed per scrape job'
            });
        }
        const job = yield apifyService_1.apifyService.scrapeWithActor(actorId, urls, industry);
        res.json({
            success: true,
            data: job
        });
    }
    catch (error) {
        console.error('Error scraping with Apify actor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to scrape with Apify actor'
        });
    }
}));
/**
 * GET /api/apify/jobs/:jobId
 * Get the status and results of an Apify scraping job
 */
router.get('/jobs/:jobId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const job = yield apifyService_1.apifyService.getScrapingJob(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }
        res.json({
            success: true,
            data: job
        });
    }
    catch (error) {
        console.error('Error fetching Apify job:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Apify job'
        });
    }
}));
/**
 * POST /api/apify/run
 * Run an Apify Actor with custom input
 */
router.post('/run', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { actorId, input } = req.body;
        if (!actorId) {
            return res.status(400).json({
                success: false,
                error: 'actorId is required'
            });
        }
        const runResult = yield apifyService_1.apifyService.runActor(actorId, input || {});
        res.json({
            success: true,
            data: runResult
        });
    }
    catch (error) {
        console.error('Error running Apify actor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run Apify actor'
        });
    }
}));
/**
 * GET /api/apify/runs/:runId
 * Get the status of an Apify run
 */
router.get('/runs/:runId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { runId } = req.params;
        const { actorId } = req.query;
        if (!actorId || typeof actorId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'actorId query parameter is required'
            });
        }
        const runStatus = yield apifyService_1.apifyService.getRunStatus(runId, actorId);
        res.json({
            success: true,
            data: runStatus
        });
    }
    catch (error) {
        console.error('Error fetching Apify run status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Apify run status'
        });
    }
}));
exports.default = router;
