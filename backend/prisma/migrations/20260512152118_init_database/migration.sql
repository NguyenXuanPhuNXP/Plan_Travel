-- CreateTable
CREATE TABLE `__efmigrationshistory` (
    `MigrationId` VARCHAR(150) NOT NULL,
    `ProductVersion` VARCHAR(32) NOT NULL,

    PRIMARY KEY (`MigrationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_challenges` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `challenge_token` VARCHAR(255) NOT NULL,
    `expires_at` TIMESTAMP(0) NOT NULL,
    `used_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `IX_auth_challenges_challenge_token`(`challenge_token`),
    INDEX `IX_auth_challenges_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `businesses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `address` VARCHAR(255) NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `geo_point` point NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `detail` TEXT NULL,
    `opening_hours` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_businesses_category`(`category_id`),
    INDEX `idx_businesses_latlng`(`latitude`, `longitude`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `category_type` ENUM('location', 'business', 'both') NOT NULL DEFAULT 'both',
    `description` VARCHAR(500) NULL,

    UNIQUE INDEX `IX_categories_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itineraries` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `trip_date` DATE NULL,
    `start_time` DATETIME(6) NULL,
    `end_time` DATETIME(6) NULL,
    `start_location` VARCHAR(255) NULL,
    `end_location` VARCHAR(255) NULL,
    `status` ENUM('draft', 'generated', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    `destination` VARCHAR(200) NULL,
    `total_days` INTEGER NULL,
    `budget` DECIMAL(12, 0) NULL,
    `preferences` JSON NULL,
    `description` TEXT NULL,
    `visibility` VARCHAR(20) NOT NULL DEFAULT 'private',
    `share_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_itineraries_share_token`(`share_token`),
    INDEX `idx_itineraries_user`(`user_id`),
    INDEX `idx_itineraries_share_token`(`share_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itinerary_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `itinerary_id` BIGINT UNSIGNED NOT NULL,
    `location_id` BIGINT UNSIGNED NULL,
    `business_id` BIGINT UNSIGNED NULL,
    `sort_order` INTEGER UNSIGNED NOT NULL,
    `planned_start_time` DATETIME(6) NULL,
    `planned_end_time` DATETIME(6) NULL,
    `travel_minutes` INTEGER UNSIGNED NULL,
    `travel_distance_km` DECIMAL(8, 2) NULL,
    `note` VARCHAR(500) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_itinerary_business`(`business_id`),
    INDEX `idx_itinerary_location`(`location_id`),
    UNIQUE INDEX `uq_itinerary_order`(`itinerary_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location_seed_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `region_name` VARCHAR(100) NOT NULL,
    `job_type` VARCHAR(50) NOT NULL DEFAULT 'geoapify_places',
    `status` ENUM('pending', 'running', 'done', 'failed') NOT NULL DEFAULT 'pending',
    `last_page` INTEGER NOT NULL DEFAULT -1,
    `last_offset` INTEGER NOT NULL DEFAULT 0,
    `fetched_total` INTEGER NOT NULL DEFAULT 0,
    `inserted_total` INTEGER NOT NULL DEFAULT 0,
    `skipped_total` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `started_at` TIMESTAMP(0) NULL,
    `finished_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_seed_region_jobtype`(`region_name`, `job_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `external_id` VARCHAR(255) NOT NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'geoapify',
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `country` VARCHAR(100) NULL,
    `country_code` VARCHAR(10) NULL,
    `province` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `region` VARCHAR(100) NULL,
    `category` VARCHAR(100) NULL,
    `subcategory` VARCHAR(150) NULL,
    `description` TEXT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `geo_point` point NOT NULL,
    `estimated_cost` INTEGER NOT NULL DEFAULT 0,
    `suggested_duration` VARCHAR(50) NULL,
    `image_url` TEXT NULL,
    `rating` DECIMAL(3, 2) NULL,
    `tags` JSON NULL,
    `raw_json` JSON NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_locations_external_id`(`external_id`),
    INDEX `idx_locations_category`(`category`),
    INDEX `idx_locations_city`(`city`),
    INDEX `idx_locations_name`(`name`),
    INDEX `idx_locations_region`(`region`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` TIMESTAMP(0) NOT NULL,
    `revoked_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `IX_refresh_tokens_token_hash`(`token_hash`),
    INDEX `IX_refresh_tokens_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `location_id` BIGINT UNSIGNED NULL,
    `business_id` BIGINT UNSIGNED NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `content` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_reviews_business_id`(`business_id`),
    INDEX `IX_reviews_location_id`(`location_id`),
    INDEX `idx_reviews_rating`(`rating`),
    UNIQUE INDEX `uq_user_business_review`(`user_id`, `business_id`),
    UNIQUE INDEX `uq_user_location_review`(`user_id`, `location_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_user_preferences_category_id`(`category_id`),
    PRIMARY KEY (`user_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    `avatar_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `IX_users_email`(`email`),
    UNIQUE INDEX `IX_users_phone`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itinerary_collaborators` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `itinerary_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `permission` VARCHAR(20) NOT NULL DEFAULT 'view',
    `invited_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `accepted_at` TIMESTAMP(0) NULL,

    INDEX `idx_collab_user`(`user_id`),
    UNIQUE INDEX `uq_collab_itinerary_user`(`itinerary_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `location_id` BIGINT UNSIGNED NULL,
    `business_id` BIGINT UNSIGNED NULL,
    `user_latitude` DECIMAL(10, 7) NOT NULL,
    `user_longitude` DECIMAL(10, 7) NOT NULL,
    `gps_point` point NOT NULL,
    `distance_meters` DECIMAL(10, 2) NULL,
    `check_in_time` TIMESTAMP(0) NOT NULL,
    `check_out_time` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_visit_history_business_id`(`business_id`),
    INDEX `IX_visit_history_location_id`(`location_id`),
    INDEX `idx_visit_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_challenges` ADD CONSTRAINT `FK_auth_challenges_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `businesses` ADD CONSTRAINT `FK_businesses_categories_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `itineraries` ADD CONSTRAINT `FK_itineraries_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `itinerary_items` ADD CONSTRAINT `FK_itinerary_items_businesses_business_id` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `itinerary_items` ADD CONSTRAINT `FK_itinerary_items_itineraries_itinerary_id` FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `itinerary_items` ADD CONSTRAINT `FK_itinerary_items_locations_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `FK_refresh_tokens_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `FK_reviews_businesses_business_id` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `FK_reviews_locations_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `FK_reviews_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `FK_user_preferences_categories_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `FK_user_preferences_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `itinerary_collaborators` ADD CONSTRAINT `FK_collab_itinerary` FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `itinerary_collaborators` ADD CONSTRAINT `FK_collab_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `visit_history` ADD CONSTRAINT `FK_visit_history_businesses_business_id` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `visit_history` ADD CONSTRAINT `FK_visit_history_locations_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `visit_history` ADD CONSTRAINT `FK_visit_history_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
