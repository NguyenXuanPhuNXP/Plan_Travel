-- ========================================================
-- PLAN TRAVEL DATABASE SCHEMA (MySQL 8.0+)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `travel_planner` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `travel_planner`;

-- 1. BẢNG CATEGORIES (Danh mục địa điểm)
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG LOCATIONS (Địa điểm du lịch)
CREATE TABLE IF NOT EXISTS `locations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `image` TEXT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `geo_point` POINT SRID 4326 NULL,
    `category_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_locations_category` FOREIGN KEY (`category_id`) 
        REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG USERS (Người dùng hệ thống - hỗ trợ Email & Google OAuth)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `google_id` VARCHAR(255) NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL,
    `name` VARCHAR(255) NOT NULL,
    `avatar` TEXT NULL,
    `role` VARCHAR(50) DEFAULT 'user',
    `auth_provider` VARCHAR(50) DEFAULT 'local',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG TRIPS (Hành trình chuyến đi)
CREATE TABLE IF NOT EXISTS `trips` (
    `id` VARCHAR(100) PRIMARY KEY,
    `user_id` INT NULL,
    `title` VARCHAR(255) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('upcoming', 'ongoing', 'completed') DEFAULT 'upcoming',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_trips_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG TRIP_LOCATIONS (Các điểm dừng trong chuyến đi)
CREATE TABLE IF NOT EXISTS `trip_locations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `trip_id` VARCHAR(100) NOT NULL,
    `location_id` INT NULL,
    `custom_name` VARCHAR(255) NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `stop_order` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_trip_locations_trip` FOREIGN KEY (`trip_id`) 
        REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ========================================================

-- Thêm Danh mục
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Danh lam thắng cảnh', 'Các cảnh quan thiên nhiên đẹp và nổi tiếng'),
(2, 'Di tích lịch sử', 'Các công trình văn hóa, di sản ngàn năm'),
(3, 'Ẩm thực & Phố cổ', 'Địa điểm ăn uống, trải nghiệm văn hóa bản địa'),
(4, 'Nghỉ dưỡng & Biển', 'Bãi biển, khu sinh thái thư giãn')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Thêm Địa điểm mẫu tại Hà Nội và Việt Nam
INSERT INTO `locations` (`name`, `address`, `description`, `image`, `latitude`, `longitude`, `geo_point`, `category_id`) VALUES
('Hồ Hoàn Kiếm', 'Hoàn Kiếm, Hà Nội', 'Trái tim của thủ đô Hà Nội với Tháp Rùa cổ kính.', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&q=80&w=800', 21.02850000, 105.85420000, ST_SRID(POINT(105.85420000, 21.02850000), 4326), 1),
('Văn Miếu - Quốc Tử Giám', '58 Quốc Tử Giám, Đống Đa, Hà Nội', 'Trường đại học đầu tiên của Việt Nam.', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800', 21.02940000, 105.83550000, ST_SRID(POINT(105.83550000, 21.02940000), 4326), 2),
('Lăng Chủ tịch Hồ Chí Minh', 'Hùng Vương, Ba Đình, Hà Nội', 'Nơi an nghỉ của Chủ tịch Hồ Chí Minh vĩ đại.', 'https://images.unsplash.com/photo-1599708153386-62e259966601?auto=format&fit=crop&q=80&w=800', 21.03680000, 105.83460000, ST_SRID(POINT(105.83460000, 21.03680000), 4326), 2),
('Cầu Long Biên', 'Long Biên, Hà Nội', 'Chứng nhân lịch sử bắc qua sông Hồng.', 'https://images.unsplash.com/photo-1571406560411-47138332159e?auto=format&fit=crop&q=80&w=800', 21.04350000, 105.85690000, ST_SRID(POINT(105.85690000, 21.04350000), 4326), 2),
('Chùa Trấn Quốc', 'Thanh Niên, Tây Hồ, Hà Nội', 'Ngôi chùa cổ nhất thủ đô cạnh Hồ Tây.', 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=800', 21.04760000, 105.83680000, ST_SRID(POINT(105.83680000, 21.04760000), 4326), 2);
