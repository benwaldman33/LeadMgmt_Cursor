import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { webSocketService } from './services/websocketService';
import authMiddleware from './middleware/auth';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Import routes
import authRoutes from './routes/auth';
console.log('authRoutes:', typeof authRoutes);
import userRoutes from './routes/users';
console.log('userRoutes:', typeof userRoutes);
import teamRoutes from './routes/teams';
console.log('teamRoutes:', typeof teamRoutes);
import campaignRoutes from './routes/campaigns';
console.log('campaignRoutes:', typeof campaignRoutes);
import leadRoutes from './routes/leads';
console.log('leadRoutes:', typeof leadRoutes);
import scoringRoutes from './routes/scoring';
console.log('scoringRoutes:', typeof scoringRoutes);
import auditLogRoutes from './routes/auditLogs';
console.log('auditLogRoutes:', typeof auditLogRoutes);
import searchRoutes from './routes/search';
console.log('searchRoutes:', typeof searchRoutes);
import analyticsRoutes from './routes/analytics';
console.log('analyticsRoutes:', typeof analyticsRoutes);
import reportsRoutes from './routes/reports';
console.log('reportsRoutes:', typeof reportsRoutes);
import aiScoringRoutes from './routes/aiScoring';
console.log('aiScoringRoutes:', typeof aiScoringRoutes);
import integrationRoutes from './routes/integrations';
console.log('integrationRoutes:', typeof integrationRoutes);
import workflowRoutes from './routes/workflows';
console.log('workflowRoutes:', typeof workflowRoutes);
import businessRuleRoutes from './routes/businessRules';
console.log('businessRuleRoutes:', typeof businessRuleRoutes);
import webScrapingRoutes from './routes/webScraping';
console.log('webScrapingRoutes:', typeof webScrapingRoutes);
import adminRouter from './routes/admin';
console.log('adminRouter:', typeof adminRouter);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket service
webSocketService.initialize(server);

// Middleware
app.use(helmet());
app.use(cors({
  // Allow all localhost ports for development; restrict in production!
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    websocket: {
      connectedUsers: webSocketService.getConnectedUsersCount()
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai-scoring', aiScoringRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/business-rules', businessRuleRoutes);
app.use('/api/web-scraping', webScrapingRoutes);
app.use('/api/admin', authMiddleware, adminRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found` 
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket enabled`);
});

export default app;
