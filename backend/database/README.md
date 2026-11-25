# Khởi tạo database local

API sử dụng MySQL và `backend/.env`. Prisma migrations là nguồn cấu trúc database chính thức. File `schema.sql` là cấu trúc cũ để tham khảo, không import vào database mới của API.

Từ thư mục gốc, chạy:

```sh
npm run db:init
```

Lệnh tạo database nếu chưa tồn tại, áp dụng migrations rồi seed dữ liệu demo. Chạy lại không xóa database, không đổi mật khẩu tài khoản đã tồn tại. Tài khoản MySQL cần quyền tạo database; lệnh chỉ chạy với server localhost.

Nếu database đã tồn tại và chỉ cần dữ liệu demo: `npm run db:seed`.

Seed gồm 3 tài khoản, 8 địa điểm Hà Nội và 8 điểm đến khám phá. 65 vật dụng được thêm bằng migrations.

| Email demo | Mật khẩu | Quyền |
| --- | --- | --- |
| admin@plantravel.com | admin123456 | Admin |
| an.nguyen.traveler@gmail.com | travel123456 | User |
| linh.le.wanderlust@gmail.com | travel123456 | User |

Các tài khoản này chỉ dành cho môi trường demo local. Seed không tạo liên kết Google giả. Khi đăng nhập Google, API xác minh token thật và lưu Google `sub` vào `google_auth_identities`.

Đặt cùng Client ID hợp lệ vào `VITE_GOOGLE_CLIENT_ID` trong `frontend/.env` và `GOOGLE_CLIENT_ID` trong `backend/.env`. Thêm origin frontend đang chạy (mặc định `http://localhost:5173`) trong Google Cloud Console. Sau khi sửa `.env`, khởi động lại API và Vite.
