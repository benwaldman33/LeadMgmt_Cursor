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
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const client_1 = require("@prisma/client");
const http_1 = require("http");
const websocketService_1 = require("./services/websocketService");
const auth_1 = __importDefault(require("./middleware/auth"));
// Load environment variables
dotenv_1.default.config();
// Initialize Prisma client
exports.prisma = new client_1.PrismaClient();
// Import routes
const auth_2 = __importDefault(require("./routes/auth"));
console.log('authRoutes:', typeof auth_2.default);
const users_1 = __importDefault(require("./routes/users"));
console.log('userRoutes:', typeof users_1.default);
const teams_1 = __importDefault(require("./routes/teams"));
console.log('teamRoutes:', typeof teams_1.default);
const campaigns_1 = __importDefault(require("./routes/campaigns"));
console.log('campaignRoutes:', typeof campaigns_1.default);
const leads_1 = __importDefault(require("./routes/leads"));
console.log('leadRoutes:', typeof leads_1.default);
const scoring_1 = __importDefault(require("./routes/scoring"));
console.log('scoringRoutes:', typeof scoring_1.default);
const auditLogs_1 = __importDefault(require("./routes/auditLogs"));
console.log('auditLogRoutes:', typeof auditLogs_1.default);
const search_1 = __importDefault(require("./routes/search"));
console.log('searchRoutes:', typeof search_1.default);
const analytics_1 = __importDefault(require("./routes/analytics"));
console.log('analyticsRoutes:', typeof analytics_1.default);
const reports_1 = __importDefault(require("./routes/reports"));
console.log('reportsRoutes:', typeof reports_1.default);
const aiScoring_1 = __importDefault(require("./routes/aiScoring"));
console.log('aiScoringRoutes:', typeof aiScoring_1.default);
const integrations_1 = __importDefault(require("./routes/integrations"));
console.log('integrationRoutes:', typeof integrations_1.default);
const workflows_1 = __importDefault(require("./routes/workflows"));
console.log('workflowRoutes:', typeof workflows_1.default);
const businessRules_1 = __importDefault(require("./routes/businessRules"));
console.log('businessRuleRoutes:', typeof businessRules_1.default);
const webScraping_1 = __importDefault(require("./routes/webScraping"));
console.log('webScrapingRoutes:', typeof webScraping_1.default);
const aiDiscovery_1 = __importDefault(require("./routes/aiDiscovery"));
console.log('aiDiscoveryRoutes:', typeof aiDiscovery_1.default);
const apify_1 = __importDefault(require("./routes/apify"));
console.log('apifyRoutes:', typeof apify_1.default);
const marketAnalysis_1 = __importDefault(require("./routes/marketAnalysis"));
console.log('marketAnalysisRoutes:', typeof marketAnalysis_1.default);
const admin_1 = __importDefault(require("./routes/admin"));
console.log('adminRouter:', typeof admin_1.default);
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3001;
// Initialize WebSocket service
websocketService_1.webSocketService.initialize(server);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    // Allow all localhost ports for development; restrict in production!
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_fileupload_1.default)({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    abortOnLimit: true,
}));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        websocket: {
            connectedUsers: websocketService_1.webSocketService.getConnectedUsersCount()
        }
    });
});
// API Routes
app.use('/api/auth', auth_2.default);
app.use('/api/users', users_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/campaigns', campaigns_1.default);
app.use('/api/leads', leads_1.default);
app.use('/api/scoring', scoring_1.default);
app.use('/api/audit-logs', auditLogs_1.default);
app.use('/api/search', search_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/ai-scoring', aiScoring_1.default);
app.use('/api/integrations', integrations_1.default);
app.use('/api/workflows', workflows_1.default);
app.use('/api/business-rules', businessRules_1.default);
app.use('/api/web-scraping', webScraping_1.default);
app.use('/api/ai-discovery', aiDiscovery_1.default);
app.use('/api/apify', apify_1.default);
app.use('/api/market-analysis', marketAnalysis_1.default);
app.use('/api/admin', auth_1.default, admin_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json(Object.assign({ error: message }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
});
// Graceful shutdown
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGTERM received, shutting down gracefully');
    yield exports.prisma.$disconnect();
    process.exit(0);
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGINT received, shutting down gracefully');
    yield exports.prisma.$disconnect();
    process.exit(0);
}));
// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket enabled`);
});
exports.default = app;
