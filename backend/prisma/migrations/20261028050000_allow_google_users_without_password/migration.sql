-- Cho phép tài khoản Google không có mật khẩu; giữ nguyên mật khẩu đã lưu của tài khoản hiện có.
ALTER TABLE `users` MODIFY COLUMN `password_hash` VARCHAR(255) NULL;
