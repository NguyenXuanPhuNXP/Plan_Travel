-- AlterTable itineraries: Add manual planning and cost breakdown fields
ALTER TABLE `itineraries` 
    ADD COLUMN `traveler_count` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `transport_mode` VARCHAR(100) NULL,
    ADD COLUMN `cost_scope` VARCHAR(20) NULL DEFAULT 'PERSON',
    ADD COLUMN `cost_transport` DECIMAL(12, 0) NULL DEFAULT 0,
    ADD COLUMN `cost_meals` DECIMAL(12, 0) NULL DEFAULT 0,
    ADD COLUMN `cost_attractions` DECIMAL(12, 0) NULL DEFAULT 0,
    ADD COLUMN `cost_accommodation` DECIMAL(12, 0) NULL DEFAULT 0,
    ADD COLUMN `cost_contingency` DECIMAL(12, 0) NULL DEFAULT 0,
    ADD COLUMN `total_cost` DECIMAL(12, 0) NULL DEFAULT 0;

-- AlterTable itinerary_items: Add custom activity title and duration
ALTER TABLE `itinerary_items` 
    ADD COLUMN `custom_name` VARCHAR(255) NULL,
    ADD COLUMN `duration_minutes` INTEGER UNSIGNED NULL;

-- CreateTable: Shared Packing Items Catalog
CREATE TABLE IF NOT EXISTS `packing_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `default_quantity` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(500) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_packing_category`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Itinerary Packing Items Checklist
CREATE TABLE IF NOT EXISTS `itinerary_packing_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `itinerary_id` BIGINT UNSIGNED NOT NULL,
    `item_name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'other',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(500) NULL,
    `is_packed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_itinerary_packing_itinerary`(`itinerary_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `itinerary_packing_items` 
    ADD CONSTRAINT `FK_itinerary_packing_items_itinerary_id` 
    FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateTable: user_friends
CREATE TABLE IF NOT EXISTS `user_friends` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `friend_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_friend_user`(`user_id`),
    INDEX `idx_user_friend_friend`(`friend_id`),
    UNIQUE INDEX `uq_user_friend`(`user_id`, `friend_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: user_notifications
CREATE TABLE IF NOT EXISTS `user_notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_notifications_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: user_messages
CREATE TABLE IF NOT EXISTS `user_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sender_id` BIGINT UNSIGNED NOT NULL,
    `receiver_id` BIGINT UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_messages_sender`(`sender_id`),
    INDEX `idx_user_messages_receiver`(`receiver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_friends` ADD CONSTRAINT `user_friends_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_friends` ADD CONSTRAINT `user_friends_friend_id_fkey` FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_messages` ADD CONSTRAINT `user_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_messages` ADD CONSTRAINT `user_messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default shared packing items
INSERT INTO `packing_items` (`name`, `category`, `default_quantity`, `notes`) VALUES
-- Quần áo (clothing)
('Áo thun / Áo sơ mi', 'clothing', 3, 'Thoáng mát, dễ giặt'),
('Quần dài / Quần jeans', 'clothing', 2, 'Lịch sự khi tham quan di tích'),
('Quần short / Váy', 'clothing', 2, 'Dễ vận động khi đi dạo'),
('Đồ lót & Tất chân', 'clothing', 4, 'Đủ cho các ngày đi'),
('Áo khoác gió / Áo chống nắng', 'clothing', 1, 'Tránh nắng gió trên đường'),
('Đồ bơi / Đồ tắm biển', 'clothing', 1, 'Nếu có lịch trình biển/hồ bơi'),
('Giày thể thao / Giày đi bộ', 'clothing', 1, 'Êm chân cho di chuyển nhiều'),
('Dép lê / Sandal', 'clothing', 1, 'Tiện đi lại buổi tối/khách sạn'),

-- Thiết bị điện tử (devices)
('Điện thoại thông minh', 'devices', 1, 'Liên lạc, tra bản đồ, chụp ảnh'),
('Củ sạc & Cáp sạc điện thoại', 'devices', 1, 'Đầy đủ cáp sạc nhanh'),
('Sạc dự phòng', 'devices', 1, 'Dung lượng từ 10.000mAh trở lên'),
('Tai nghe cá nhân', 'devices', 1, 'Nghe nhạc/xem phim khi di chuyển'),
('Máy ảnh & Thẻ nhớ phụ', 'devices', 1, 'Chụp hình phong cảnh'),

-- Dụng cụ & Vệ sinh cá nhân (tools)
('Bàn chải & Kem đánh răng', 'tools', 1, 'Bộ vệ sinh cá nhân nhỏ gọn'),
('Dầu gội & Sữa tắm mini', 'tools', 1, 'Chiết chai du lịch < 100ml'),
('Khăn mặt & Khăn tắm du lịch', 'tools', 1, 'Khăn nhanh khô'),
('Lược & Bấm móng tay', 'tools', 1, 'Tiện dụng khi đi xa'),
('Kem chống nắng', 'tools', 1, 'SPF 50+ chống tia UV'),
('Xịt chống muỗi & Côn trùng', 'tools', 1, 'Cần thiết khi đi dã ngoại/rừng núi'),

-- Phụ kiện (accessories)
('Kính râm / Kính mát', 'accessories', 1, 'Bảo vệ mắt khi trời nắng'),
('Mũ / Nón rộng vành', 'accessories', 1, 'Che nắng khi tham quan'),
('Dù / Ô gấp gọn', 'accessories', 1, 'Phòng mưa nắng bất chợt'),
('Túi đeo chéo / Balo nhỏ', 'accessories', 1, 'Đựng điện thoại, ví tiền khi đi chơi'),
('Túi zip / Túi chống nước', 'accessories', 2, 'Bảo vệ thiết bị khi trời mưa'),

-- Giấy tờ & Tiền bạc (documents)
('Căn cước công dân / Hộ chiếu', 'documents', 1, 'Bản gốc để check-in khách sạn, máy bay'),
('Bằng lái xe máy / Ô tô', 'documents', 1, 'Cần khi thuê xe tự lái'),
('Tiền mặt (mệnh giá nhỏ & vừa)', 'documents', 1, 'Thanh toán ăn uống đường phố/gửi xe'),
('Thẻ ngân hàng / Thẻ tín dụng', 'documents', 1, 'Thanh toán không tiền mặt'),
('Vé tàu xe / Vé máy bay / Đặt phòng', 'documents', 1, 'Lưu sẵn mã QR hoặc bản in'),

-- Thuốc & Y tế (medical)
('Thuốc cảm sốt (Paracetamol)', 'medical', 1, 'Dự phòng say nắng, cảm mạo'),
('Thuốc tiêu hóa / Men vi sinh', 'medical', 1, 'Phòng ngừa đau bụng khi ăn lạ miệng'),
('Băng cá nhân Urgo & Cồn đỏ', 'medical', 1, 'Sơ cứu vết xước nhỏ'),
('Thuốc say xe / say sóng', 'medical', 1, 'Uống 30 phút trước khi xuất phát');
