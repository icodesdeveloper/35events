-- AlterTable
ALTER TABLE "Event" ADD COLUMN "draftData" JSONB;
ALTER TABLE "Event" ADD COLUMN "registrationEndDate" DATETIME;
ALTER TABLE "Event" ADD COLUMN "registrationStartDate" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleType" TEXT,
    "vehiclePhotoPath" TEXT,
    "addedManually" BOOLEAN NOT NULL DEFAULT false,
    "passengerCount" INTEGER NOT NULL DEFAULT 0,
    "priceSnapshot" DECIMAL,
    "passengerPriceSnapshot" DECIMAL,
    "discountCodeId" TEXT,
    "discountAmountSnapshot" DECIMAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentReference" TEXT,
    "extraInfoNotifiedAt" DATETIME,
    "extraInfoReminderSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Registration_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Registration_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Registration" ("createdAt", "discountAmountSnapshot", "discountCodeId", "eventId", "extraInfoNotifiedAt", "extraInfoReminderSentAt", "id", "participantId", "passengerCount", "passengerPriceSnapshot", "paymentReference", "paymentStatus", "priceSnapshot", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePhotoPath", "vehicleType") SELECT "createdAt", "discountAmountSnapshot", "discountCodeId", "eventId", "extraInfoNotifiedAt", "extraInfoReminderSentAt", "id", "participantId", "passengerCount", "passengerPriceSnapshot", "paymentReference", "paymentStatus", "priceSnapshot", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePhotoPath", "vehicleType" FROM "Registration";
DROP TABLE "Registration";
ALTER TABLE "new_Registration" RENAME TO "Registration";
CREATE UNIQUE INDEX "Registration_paymentReference_key" ON "Registration"("paymentReference");
CREATE INDEX "Registration_eventId_idx" ON "Registration"("eventId");
CREATE INDEX "Registration_participantId_idx" ON "Registration"("participantId");
CREATE INDEX "Registration_discountCodeId_idx" ON "Registration"("discountCodeId");
CREATE UNIQUE INDEX "Registration_eventId_participantId_key" ON "Registration"("eventId", "participantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
