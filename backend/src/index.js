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
const client_1 = require("@prisma/client");
const http_1 = require("http");
const websocketService_1 = require("./services/websocketService");
// Load environment variables
dotenv_1.default.config();
// Initialize Prisma client
exports.prisma = new client_1.PrismaClient();
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const teams_1 = __importDefault(require("./routes/teams"));
const campaigns_1 = __importDefault(require("./routes/campaigns"));
const leads_1 = __importDefault(require("./routes/leads"));
const scoring_1 = __importDefault(require("./routes/scoring"));
const auditLogs_1 = __importDefault(require("./routes/auditLogs"));
const search_1 = __importDefault(require("./routes/search"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const reports_1 = __importDefault(require("./routes/reports"));
const aiScoring_1 = __importDefault(require("./routes/aiScoring"));
const integrations_1 = __importDefault(require("./routes/integrations"));
const workflows_1 = __importDefault(require("./routes/workflows"));
const businessRules_1 = __importDefault(require("./routes/businessRules"));
const webScraping_1 = __importDefault(require("./routes/webScraping"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3001;
// Initialize WebSocket service
websocketService_1.webSocketService.initialize(server);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/auth', auth_1.default);
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
