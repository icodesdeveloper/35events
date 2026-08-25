-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "participantIds" JSONB;

-- CreateTable
CREATE TABLE "EarlybirdPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EarlybirdPrice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EarlybirdPrice_eventId_idx" ON "EarlybirdPrice"("eventId");
