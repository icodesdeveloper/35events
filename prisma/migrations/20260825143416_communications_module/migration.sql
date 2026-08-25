-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "audienceMode" TEXT NOT NULL,
    "eventIds" JSONB,
    "statuses" JSONB,
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "sentCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
