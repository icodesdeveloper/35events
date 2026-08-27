/*
  Warnings:

  - Made the column `sectionId` on table `EventMedia` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMedia_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "EventMediaSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventMedia" ("caption", "createdAt", "eventId", "filePath", "id", "order", "sectionId", "type") SELECT "caption", "createdAt", "eventId", "filePath", "id", "order", "sectionId", "type" FROM "EventMedia";
DROP TABLE "EventMedia";
ALTER TABLE "new_EventMedia" RENAME TO "EventMedia";
CREATE INDEX "EventMedia_eventId_order_idx" ON "EventMedia"("eventId", "order");
CREATE INDEX "EventMedia_sectionId_order_idx" ON "EventMedia"("sectionId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
