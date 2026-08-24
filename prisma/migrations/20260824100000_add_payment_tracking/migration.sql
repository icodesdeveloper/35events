-- AlterTable
ALTER TABLE `Registration` ADD COLUMN `paymentReference` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(8, 2) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_registrationId_idx`(`registrationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Registration_paymentReference_key` ON `Registration`(`paymentReference`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
