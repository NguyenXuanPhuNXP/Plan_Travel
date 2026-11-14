-- Make legacy name column nullable to avoid constraint conflicts
SET @legacy_name_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'name'),
    'ALTER TABLE `users` MODIFY COLUMN `name` VARCHAR(255) NULL DEFAULT NULL',
    'SELECT 1'
);
PREPARE legacy_name_statement FROM @legacy_name_sql;
EXECUTE legacy_name_statement;
DEALLOCATE PREPARE legacy_name_statement;

-- CreateTable: itinerary_messages
CREATE TABLE IF NOT EXISTS `itinerary_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `itinerary_id` BIGINT UNSIGNED NOT NULL,
    `sender_id` BIGINT UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_itinerary_messages_itinerary`(`itinerary_id`),
    INDEX `idx_itinerary_messages_sender`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `itinerary_messages` ADD CONSTRAINT `FK_itinerary_messages_itinerary` FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `itinerary_messages` ADD CONSTRAINT `FK_itinerary_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed additional diverse packing items
INSERT INTO `packing_items` (`name`, `category`, `default_quantity`, `notes`) VALUES
-- Đồ mùa đông / Vùng cao / Giữ ấm
('Áo len / Áo nỉ giữ nhiệt', 'clothing', 2, 'Cần thiết cho Đà Lạt, Sa Pa, vùng núi lạnh'),
('Áo khoác dày / Áo phao đại hàn', 'clothing', 1, 'Chống rét khi du lịch mùa đông'),
('Khăn quàng cổ & Găng tay len', 'clothing', 1, 'Giữ ấm cổ và tay khi đi đêm'),
('Tất len dày / Tất giữ nhiệt', 'clothing', 3, 'Tránh cóng chân khi nhiệt độ thấp'),
('Miếng dán giữ nhiệt', 'accessories', 4, 'Dán bụng hoặc lưng giữ ấm cơ thể'),

-- Đồ biển & Thể thao nước
('Kính bơi / Kính lặn ngắm san hô', 'accessories', 1, 'Phù hợp khi đi Phú Quốc, Nha Trang'),
('Túi chống nước điện thoại', 'accessories', 1, 'Bảo vệ điện thoại khi bơi biển, chèo SUP'),
('Khăn choàng đi biển / Khăn rằn', 'accessories', 1, 'Tránh gió và che nắng tạo dáng chụp ảnh'),
('Giày đi biển chống trượt / Dép xỏ ngón', 'clothing', 1, 'Bảo vệ chân tránh san hô sắc nhọn'),
('Phao bơi / Áo phao cá nhân', 'accessories', 1, 'An toàn cho trẻ em hoặc người không biết bơi'),

-- Dã ngoại / Cắm trại / Leo núi
('Đèn pin mini / Đèn đeo trán', 'devices', 1, 'Tiện đi đêm cắm trại hoặc trekking'),
('Gậy leo núi chuyên dụng', 'tools', 1, 'Hỗ trợ lực khi trekking đường dốc'),
('Bình nước giữ nhiệt cá nhân', 'tools', 1, 'Đựng nước ấm hoặc trà giải khát'),
('Bật lửa / Hộp quẹt chống nước', 'tools', 1, 'Tiện dụng khi nấu nướng dã ngoại'),
('Dao đa năng xếp gọn (Swiss Army Knife)', 'tools', 1, 'Cắt dây, mở nắp đồ hộp, sửa chữa nhỏ'),
('Túi ngủ / Tấm cách nhiệt lều', 'tools', 1, 'Cần thiết nếu lịch trình cắm trại qua đêm'),

-- Thiết bị công nghệ & Tiện ích
('Ổ cắm đa năng du lịch (Universal Adapter)', 'devices', 1, 'Tương thích mọi loại chân cắm khách sạn'),
('Dây cáp sạc 3 đầu (Type-C / Lightning / Micro)', 'devices', 1, 'Sạc được nhiều loại máy cùng lúc'),
('Gậy chụp ảnh selfie kèm chân đế Tripod', 'devices', 1, 'Chụp ảnh nhóm không cần người khác chụp hộ'),
('SIM 4G / eSIM du lịch', 'devices', 1, 'Đảm bảo kết nối internet thông suốt liên tục'),

-- Vệ sinh & Chăm sóc da
('Son dưỡng ẩm chống nẻ môi', 'tools', 1, 'Tránh khô môi do nắng hoặc gió lạnh'),
('Xịt khoáng cấp ẩm', 'tools', 1, 'Làm dịu da tức thì khi đi ngoài nắng gắt'),
('Nước tẩy trang & Bông tẩy trang mini', 'tools', 1, 'Làm sạch bụi bẩn sau ngày dài tham quan'),
('Khăn ướt kháng khuẩn / Giấy ăn bỏ túi', 'tools', 3, 'Lau tay, lau mặt tiện lợi mọi nơi'),
('Bịt mắt ngủ & Nút tai giảm ồn', 'accessories', 1, 'Giúp ngủ ngon trên máy bay / tàu xe'),
('Gối chữ U kê cổ du lịch', 'accessories', 1, 'Chống mỏi cổ khi ngồi xe đường dài'),

-- Thuốc & Chăm sóc sức khỏe
('Dầu gió / Cao xoa bóp trị đau nhức', 'medical', 1, 'Giảm đau cơ, nghẹt mũi, xua tan mệt mỏi'),
('Nước muối sinh lý nhỏ mắt & mũi', 'medical', 2, 'Rửa sạch bụi bẩn khi đi đường dài'),
('Thuốc chống dị ứng / Dị ứng hải sản', 'medical', 1, 'Phòng dị ứng thời tiết hoặc thức ăn lạ'),
('Nhiệt kế điện tử mini', 'medical', 1, 'Theo dõi thân nhiệt khi bị ốm'),
('Thuốc xịt họng giảm ho thảo dược', 'medical', 1, 'Làm dịu họng khi thay đổi thời tiết'),
('Khẩu trang y tế kháng khuẩn', 'medical', 5, 'Bảo vệ đường hô hấp khi đến nơi đông người');
