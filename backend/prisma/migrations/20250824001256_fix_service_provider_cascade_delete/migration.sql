-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_operation_service_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "config" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "operation_service_mappings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_operation_service_mappings" ("config", "createdAt", "id", "isEnabled", "operation", "priority", "serviceId", "updatedAt") SELECT "config", "createdAt", "id", "isEnabled", "operation", "priority", "serviceId", "updatedAt" FROM "operation_service_mappings";
DROP TABLE "operation_service_mappings";
ALTER TABLE "new_operation_service_mappings" RENAME TO "operation_service_mappings";
CREATE UNIQUE INDEX "operation_service_mappings_operation_serviceId_key" ON "operation_service_mappings"("operation", "serviceId");
CREATE TABLE "new_service_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "userId" TEXT,
    "operation" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "cost" REAL,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_usage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_providers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_service_usage" ("cost", "createdAt", "duration", "errorMessage", "id", "metadata", "operation", "serviceId", "success", "tokensUsed", "userId") SELECT "cost", "createdAt", "duration", "errorMessage", "id", "metadata", "operation", "serviceId", "success", "tokensUsed", "userId" FROM "service_usage";
DROP TABLE "service_usage";
ALTER TABLE "new_service_usage" RENAME TO "service_usage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
