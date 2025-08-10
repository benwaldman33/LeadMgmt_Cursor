-- CreateTable
CREATE TABLE "market_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "market_analyses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discovery_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "subIndustry" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "marketSize" INTEGER,
    "buyerProfile" TEXT NOT NULL,
    "searchStrategy" TEXT NOT NULL,
    "targetCriteria" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastExecuted" DATETIME,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "performanceMetrics" TEXT,
    "createdById" TEXT NOT NULL,
    "marketAnalysisId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "discovery_models_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "discovery_models_marketAnalysisId_fkey" FOREIGN KEY ("marketAnalysisId") REFERENCES "market_analyses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discovery_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "phase" TEXT NOT NULL DEFAULT 'market_research',
    "prospectsFound" INTEGER NOT NULL DEFAULT 0,
    "prospectsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "leadsQualified" INTEGER NOT NULL DEFAULT 0,
    "leadsCreated" INTEGER NOT NULL DEFAULT 0,
    "executionConfig" TEXT NOT NULL,
    "sourceResults" TEXT,
    "analysisResults" TEXT,
    "qualityMetrics" TEXT,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "totalCost" REAL,
    "avgLeadCost" REAL,
    "processingTime" INTEGER,
    "discoveryModelId" TEXT NOT NULL,
    "triggeredById" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "discovery_executions_discoveryModelId_fkey" FOREIGN KEY ("discoveryModelId") REFERENCES "discovery_models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "discovery_executions_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discovered_prospects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT,
    "domain" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "rawData" TEXT NOT NULL,
    "contentAnalysis" TEXT,
    "relevanceScore" REAL,
    "qualityScore" REAL,
    "confidenceScore" REAL,
    "isQualified" BOOLEAN NOT NULL DEFAULT false,
    "qualifiedAt" DATETIME,
    "disqualificationReason" TEXT,
    "leadCreated" BOOLEAN NOT NULL DEFAULT false,
    "leadCreatedAt" DATETIME,
    "leadId" TEXT,
    "discoveryExecutionId" TEXT NOT NULL,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "discovered_prospects_discoveryExecutionId_fkey" FOREIGN KEY ("discoveryExecutionId") REFERENCES "discovery_executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "apify_actors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "actorId" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultInput" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "apify_actors_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "apify_scraping_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "urls" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "results" TEXT,
    "error" TEXT,
    "apifyRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RAW',
    "score" REAL,
    "externalId" TEXT,
    "externalSource" TEXT,
    "campaignId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedTeamId" TEXT,
    "discoveryExecutionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastScoredAt" DATETIME,
    CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "leads_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "leads_discoveryExecutionId_fkey" FOREIGN KEY ("discoveryExecutionId") REFERENCES "discovery_executions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_leads" ("assignedTeamId", "assignedToId", "campaignId", "companyName", "createdAt", "domain", "externalId", "externalSource", "id", "industry", "lastScoredAt", "score", "status", "updatedAt", "url") SELECT "assignedTeamId", "assignedToId", "campaignId", "companyName", "createdAt", "domain", "externalId", "externalSource", "id", "industry", "lastScoredAt", "score", "status", "updatedAt", "url" FROM "leads";
DROP TABLE "leads";
ALTER TABLE "new_leads" RENAME TO "leads";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
