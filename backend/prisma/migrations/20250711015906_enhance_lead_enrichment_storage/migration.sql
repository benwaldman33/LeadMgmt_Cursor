-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_lead_enrichments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companySize" INTEGER,
    "revenue" TEXT,
    "industry" TEXT,
    "technologies" TEXT NOT NULL,
    "scrapedContent" TEXT,
    "pageTitle" TEXT,
    "pageDescription" TEXT,
    "pageKeywords" TEXT,
    "pageLanguage" TEXT,
    "lastModified" TEXT,
    "companyName" TEXT,
    "services" TEXT,
    "certifications" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "scrapingTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingTime" INTEGER,
    "scrapingSuccess" BOOLEAN NOT NULL DEFAULT true,
    "scrapingError" TEXT,
    "leadId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEB_SCRAPING',
    "enrichedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_enrichments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_lead_enrichments" ("companySize", "enrichedAt", "id", "industry", "leadId", "revenue", "source", "technologies") SELECT "companySize", "enrichedAt", "id", "industry", "leadId", "revenue", "source", "technologies" FROM "lead_enrichments";
DROP TABLE "lead_enrichments";
ALTER TABLE "new_lead_enrichments" RENAME TO "lead_enrichments";
CREATE UNIQUE INDEX "lead_enrichments_leadId_key" ON "lead_enrichments"("leadId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
