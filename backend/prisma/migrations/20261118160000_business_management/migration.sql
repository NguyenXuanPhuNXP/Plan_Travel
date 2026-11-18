ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user', 'business', 'admin') NOT NULL DEFAULT 'user';

ALTER TABLE `businesses`
 ADD COLUMN `location_id` BIGINT UNSIGNED NULL,
 ADD COLUMN `business_type` VARCHAR(30) NOT NULL DEFAULT 'food',
 ADD COLUMN `contact` VARCHAR(255) NULL,
 ADD COLUMN `price_min` INTEGER NULL,
 ADD COLUMN `price_max` INTEGER NULL,
 ADD COLUMN `price_unit` VARCHAR(30) NULL,
 ADD COLUMN `attributes` JSON NULL,
 ADD COLUMN `gallery` JSON NULL,
 ADD UNIQUE INDEX `businesses_location_id_key` (`location_id`),
 ADD CONSTRAINT `businesses_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `visit_history`
 ADD COLUMN `accuracy_meters` DECIMAL(8,2) NULL,
 ADD COLUMN `captured_at` TIMESTAMP(0) NULL,
 ADD COLUMN `visit_key` VARCHAR(120) NULL,
 ADD UNIQUE INDEX `visit_history_visit_key_key` (`visit_key`);

ALTER TABLE `reviews`
 ADD INDEX `idx_reviews_user` (`user_id`),
 DROP INDEX `uq_user_business_review`,
 DROP INDEX `uq_user_location_review`,
 ADD COLUMN `visit_id` BIGINT UNSIGNED NULL,
 ADD COLUMN `owner_reply` TEXT NULL,
 ADD COLUMN `replied_at` TIMESTAMP(0) NULL,
 ADD COLUMN `is_hidden` BOOLEAN NOT NULL DEFAULT false,
 ADD UNIQUE INDEX `reviews_visit_id_key` (`visit_id`),
 ADD CONSTRAINT `reviews_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `visit_history`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `business_managers` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 `business_id` BIGINT UNSIGNED NOT NULL,
 `user_id` BIGINT UNSIGNED NOT NULL,
 `status` VARCHAR(20) NOT NULL DEFAULT 'active',
 `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
 UNIQUE KEY `business_managers_business_id_user_id_key` (`business_id`,`user_id`),
 KEY `business_managers_user_id_status_idx` (`user_id`,`status`),
 FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
 FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `business_applications` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 `applicant_id` BIGINT UNSIGNED NOT NULL,
 `business_id` BIGINT UNSIGNED NULL,
 `location_id` BIGINT UNSIGNED NULL,
 `kind` VARCHAR(20) NOT NULL,
 `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
 `payload` JSON NOT NULL,
 `ai_result` JSON NULL,
 `ai_status` VARCHAR(20) NOT NULL DEFAULT 'idle',
 `ai_error` TEXT NULL,
 `decision_reason` TEXT NULL,
 `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
 `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
 KEY `business_applications_status_created_at_idx` (`status`,`created_at`),
 KEY `business_applications_applicant_id_status_idx` (`applicant_id`,`status`),
 FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
 FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE SET NULL,
 FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `business_evidence` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 `application_id` BIGINT UNSIGNED NOT NULL,
 `kind` VARCHAR(30) NOT NULL,
 `filename` VARCHAR(255) NOT NULL,
 `mime_type` VARCHAR(100) NOT NULL,
 `storage_key` VARCHAR(100) NOT NULL,
 `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
 UNIQUE KEY `business_evidence_storage_key_key` (`storage_key`),
 KEY `business_evidence_application_id_idx` (`application_id`),
 FOREIGN KEY (`application_id`) REFERENCES `business_applications`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `business_application_events` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 `application_id` BIGINT UNSIGNED NOT NULL,
 `actor_id` BIGINT UNSIGNED NOT NULL,
 `action` VARCHAR(30) NOT NULL,
 `reason` TEXT NULL,
 `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
 KEY `business_application_events_application_id_created_at_idx` (`application_id`,`created_at`),
 FOREIGN KEY (`application_id`) REFERENCES `business_applications`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `business_review_reports` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 `business_id` BIGINT UNSIGNED NOT NULL,
 `review_id` BIGINT UNSIGNED NOT NULL,
 `reporter_id` BIGINT UNSIGNED NOT NULL,
 `reason` VARCHAR(500) NOT NULL,
 `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
 `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
 UNIQUE KEY `business_review_reports_review_id_reporter_id_key` (`review_id`,`reporter_id`),
 KEY `business_review_reports_status_created_at_idx` (`status`,`created_at`),
 FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE,
 FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON DELETE CASCADE,
 FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
