-- CreateTable
CREATE TABLE "EventMediaShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "revokedAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMediaShareLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EventMediaShareLink_token_key" ON "EventMediaShareLink"("token");

-- CreateIndex
CREATE INDEX "EventMediaShareLink_eventId_idx" ON "EventMediaShareLink"("eventId");
