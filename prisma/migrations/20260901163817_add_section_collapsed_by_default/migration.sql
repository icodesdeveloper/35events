-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventMediaSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "collapsedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "inheritVisibility" BOOLEAN NOT NULL DEFAULT true,
    "visibility" TEXT NOT NULL DEFAULT 'HIDDEN',
    "visibleFromDate" DATETIME,
    "visibleFromTarget" TEXT,
    "inheritDownload" BOOLEAN NOT NULL DEFAULT true,
    "downloadPermission" TEXT NOT NULL DEFAULT 'NOBODY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMediaSection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventMediaSection" ("createdAt", "downloadPermission", "eventId", "id", "inheritDownload", "inheritVisibility", "isHighlight", "order", "title", "visibility", "visibleFromDate", "visibleFromTarget") SELECT "createdAt", "downloadPermission", "eventId", "id", "inheritDownload", "inheritVisibility", "isHighlight", "order", "title", "visibility", "visibleFromDate", "visibleFromTarget" FROM "EventMediaSection";
DROP TABLE "EventMediaSection";
ALTER TABLE "new_EventMediaSection" RENAME TO "EventMediaSection";
CREATE INDEX "EventMediaSection_eventId_order_idx" ON "EventMediaSection"("eventId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
