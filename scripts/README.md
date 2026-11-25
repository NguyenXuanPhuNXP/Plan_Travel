# Dọn thư mục dự án

Giữ các thư mục đang sử dụng:

- `frontend/`: giao diện React và dependency riêng.
- `backend/`: API Express, Prisma, kiểm thử và dependency riêng.
- `backend/python_service/`: dịch vụ AI và thời tiết ở cổng 8001.
- `backend/database/`: SQL khởi tạo được `backend/compose.yml` sử dụng.
- `.git/`: lịch sử Git; `.agents/`: hướng dẫn cho công cụ lập trình.
- `.vscode/`: cấu hình trình soạn thảo, có thể giữ.

Script `clean-project.ps1` xóa các bản cũ trong `archive/`, dependency dư ở thư mục gốc, cache Visual Studio/Python, bản build frontend, log và lockfile npm đặt nhầm trong dịch vụ Python. Script giữ nguyên mã nguồn hiện tại, database, các file `.env` đang dùng và dependency trong frontend/backend.

Chạy từ thư mục gốc dự án:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/clean-project.ps1
```

Sau đó dùng `npm run dev` và `npm run backend:dev` ở hai terminal. Bản build có thể tạo lại bằng `npm run build`.
