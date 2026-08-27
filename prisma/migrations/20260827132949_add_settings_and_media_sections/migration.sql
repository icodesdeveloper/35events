-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "bankAccountIban" TEXT,
    "bankAccountName" TEXT
);

-- CreateTable
CREATE TABLE "EventMediaSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,
    "inheritVisibility" BOOLEAN NOT NULL DEFAULT true,
    "visibility" TEXT NOT NULL DEFAULT 'HIDDEN',
    "visibleFromDate" DATETIME,
    "visibleFromTarget" TEXT,
    "inheritDownload" BOOLEAN NOT NULL DEFAULT true,
    "downloadPermission" TEXT NOT NULL DEFAULT 'NOBODY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMediaSection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "endDate" DATETIME,
    "distanceKm" REAL,
    "durationMinutes" INTEGER,
    "price" DECIMAL,
    "passengerPrice" DECIMAL,
    "maxPassengers" INTEGER NOT NULL DEFAULT 0,
    "coverImagePath" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "registrationStartDate" DATETIME,
    "registrationEndDate" DATETIME,
    "draftData" JSONB,
    "mediaVisibility" TEXT NOT NULL DEFAULT 'HIDDEN',
    "mediaVisibleFromDate" DATETIME,
    "mediaVisibleFromTarget" TEXT,
    "downloadPermission" TEXT NOT NULL DEFAULT 'NOBODY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Event" ("coverImagePath", "createdAt", "date", "description", "distanceKm", "draftData", "durationMinutes", "endDate", "id", "maxPassengers", "name", "passengerPrice", "price", "published", "registrationEndDate", "registrationOpen", "registrationStartDate", "slug", "updatedAt") SELECT "coverImagePath", "createdAt", "date", "description", "distanceKm", "draftData", "durationMinutes", "endDate", "id", "maxPassengers", "name", "passengerPrice", "price", "published", "registrationEndDate", "registrationOpen", "registrationStartDate", "slug", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_date_idx" ON "Event"("date");
CREATE TABLE "new_EventMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "sectionId" TEXT,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventMedia_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "EventMediaSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventMedia" ("caption", "createdAt", "eventId", "filePath", "id", "order", "type") SELECT "caption", "createdAt", "eventId", "filePath", "id", "order", "type" FROM "EventMedia";
DROP TABLE "EventMedia";
ALTER TABLE "new_EventMedia" RENAME TO "EventMedia";
CREATE INDEX "EventMedia_eventId_order_idx" ON "EventMedia"("eventId", "order");
CREATE INDEX "EventMedia_sectionId_order_idx" ON "EventMedia"("sectionId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EventMediaSection_eventId_order_idx" ON "EventMediaSection"("eventId", "order");
