-- CreateTable
CREATE TABLE "AdminAllowlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" DATETIME,
    "disabledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ParticipantMagicLinkToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantMagicLinkToken_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventQuestionForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "deadline" DATETIME,
    "responsesOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventQuestionForm_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "perPassenger" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EventQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "EventQuestionForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventQuestionAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "passengerIndex" INTEGER NOT NULL DEFAULT 0,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventQuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EventQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventQuestionAnswer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleType" TEXT,
    "vehiclePhotoPath" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "eventId" TEXT,
    "participantId" TEXT,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscountCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountCode_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminAllowlist_email_key" ON "AdminAllowlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_username_key" ON "Participant"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantMagicLinkToken_tokenHash_key" ON "ParticipantMagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ParticipantMagicLinkToken_participantId_idx" ON "ParticipantMagicLinkToken"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EventQuestionForm_eventId_key" ON "EventQuestionForm"("eventId");

-- CreateIndex
CREATE INDEX "EventQuestion_formId_order_idx" ON "EventQuestion"("formId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "EventQuestionAnswer_questionId_registrationId_passengerIndex_key" ON "EventQuestionAnswer"("questionId", "registrationId", "passengerIndex");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_order_idx" ON "EventMedia"("eventId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_paymentReference_key" ON "Registration"("paymentReference");

-- CreateIndex
CREATE INDEX "Registration_eventId_idx" ON "Registration"("eventId");

-- CreateIndex
CREATE INDEX "Registration_participantId_idx" ON "Registration"("participantId");

-- CreateIndex
CREATE INDEX "Registration_discountCodeId_idx" ON "Registration"("discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_participantId_key" ON "Registration"("eventId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_eventId_idx" ON "DiscountCode"("eventId");

-- CreateIndex
CREATE INDEX "DiscountCode_participantId_idx" ON "DiscountCode"("participantId");

-- CreateIndex
CREATE INDEX "Payment_registrationId_idx" ON "Payment"("registrationId");
