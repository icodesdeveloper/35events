-- AlterTable
ALTER TABLE `Registration` ADD COLUMN `extraInfoNotifiedAt` DATETIME(3) NULL,
    ADD COLUMN `extraInfoReminderSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `EventQuestionForm` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EventQuestionForm_eventId_key`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `type` ENUM('TEXT', 'EMAIL', 'NUMBER', 'SELECT') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `options` JSON NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `EventQuestion_formId_order_idx`(`formId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventQuestionAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EventQuestionAnswer_questionId_registrationId_key`(`questionId`, `registrationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventQuestionForm` ADD CONSTRAINT `EventQuestionForm_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventQuestion` ADD CONSTRAINT `EventQuestion_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `EventQuestionForm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventQuestionAnswer` ADD CONSTRAINT `EventQuestionAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `EventQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventQuestionAnswer` ADD CONSTRAINT `EventQuestionAnswer_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
