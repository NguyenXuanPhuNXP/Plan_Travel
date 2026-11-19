# Cấu trúc dự án

- `frontend/`: giao diện React, public assets, cấu hình Vite và dependency riêng.
- `backend/`: API Express, Prisma, kiểm thử và dependency riêng.
- `backend/database/`: hướng dẫn DB và SQL cũ để tham khảo; cấu trúc hiện tại nằm trong `backend/prisma/migrations/`. Khởi tạo bằng `npm run db:init`.
- `backend/compose.yml`: MySQL và phpMyAdmin. Chạy từ thư mục gốc bằng `npm run db:up`.
- `backend/python_service/`: dịch vụ AI và thời tiết, đọc cấu hình từ `backend/.env`.
- `scripts/`: tiện ích quản lý toàn dự án.
- `package.json` ở gốc: lệnh gọi frontend/backend, không có dependency riêng.
- `.git/`, `.agents/`, `.vscode/`: lịch sử Git, hướng dẫn công cụ và cấu hình trình soạn thảo.

Không cần `node_modules/` ở gốc hoặc `archive/`. Script `scripts/clean-project.ps1` xóa các thư mục này và cache cũ. Hai thư mục `frontend/node_modules/` và `backend/node_modules/` cần giữ để chạy ứng dụng.

Cấu hình thời tiết từ `.env` gốc đã được bổ sung vào `backend/.env` nếu chưa có. File `.env` gốc được giữ để tránh mất cấu hình cũ.
