# PlanTravel

Ứng dụng lập kế hoạch du lịch Việt Nam với lịch trình theo ngày, bản đồ, bạn đồng hành, danh sách đồ mang theo và quản lý từng khoản chi. Frontend dùng React/Vite; API dùng Express, Prisma và MySQL. Dịch vụ Python cung cấp các API AI, tìm kiếm và thời tiết.

Luồng lập kế hoạch thủ công hoạt động với frontend, API Node.js và MySQL. Màn lập kế hoạch AI gọi API để lấy địa điểm thực và tạo lịch trình. Nếu Python AI không phản hồi, backend sắp xếp các địa điểm thực theo quy tắc; nếu chưa lấy được địa điểm đúng vùng, giao diện báo lỗi.

## Yêu cầu

| Thành phần | Yêu cầu |
| --- | --- |
| Node.js | Node 24 hoặc Node 22 từ phiên bản 22.12 trở lên, kèm npm |
| Database | MySQL 8.0, chạy local hoặc qua Docker Compose |
| Git | Để tải và cập nhật mã nguồn |
| Python | Python 3.11 nếu cần chạy dịch vụ AI/thời tiết |

Các lệnh bên dưới chạy từ **thư mục gốc `Plan_Travel`**, trừ phần Python có ghi rõ thư mục riêng. Ví dụ sao chép file và tạo môi trường Python dùng PowerShell trên Windows.

## Cài đặt lần đầu

### 1. Tải mã nguồn và tạo file cấu hình

```powershell
git clone --branch Develops https://github.com/NguyenXuanPhuNXP/Plan_Travel.git
cd Plan_Travel
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Nếu đã có mã nguồn và file `.env`, giữ lại các file đang dùng. Trên macOS/Linux có thể thay `Copy-Item` bằng `cp`.

Sửa `backend/.env`:

```dotenv
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/travel_planner"
PORT=5000
FRONTEND_URL=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Thay `YOUR_MYSQL_PASSWORD` bằng mật khẩu MySQL của máy. Nếu dùng Docker Compose của dự án, mật khẩu mặc định là `123456`. Nếu mật khẩu chứa ký tự đặc biệt như `@`, `#`, `/`, cần mã hóa URL phần mật khẩu. Đổi `JWT_SECRET` thành chuỗi bí mật riêng; không commit các file `.env`.

Sửa `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

### 2. Khởi động MySQL

Chọn **một** trong hai cách:

- **MySQL local:** khởi động MySQL 8.0 trên cổng `3306`. Tài khoản trong `DATABASE_URL` cần quyền tạo database khi chạy `db:init` lần đầu.
- **Docker:** bật Docker Desktop rồi chạy:

  ```powershell
  npm run db:up
  docker compose -f backend/compose.yml logs mysql
  ```

  Đợi MySQL báo sẵn sàng nhận kết nối rồi tiếp tục. Compose chỉ chạy MySQL và phpMyAdmin, không tự chạy API, frontend hay migrations. phpMyAdmin ở `http://localhost:8080`, tài khoản `root`, mật khẩu `123456`.

Nếu cổng `3306` đã được MySQL local sử dụng, dùng dịch vụ đó hoặc dừng nó trước khi bật MySQL bằng Docker.

### 3. Cài dependencies và khởi tạo database

```powershell
npm run install:all
npm run db:generate
npm run db:init
```

- `install:all`: cài dependencies theo lockfile của `frontend/` và `backend/` bằng `npm ci`.
- `db:generate`: tạo Prisma Client theo schema hiện tại.
- `db:init`: tạo database local nếu thiếu, áp dụng toàn bộ migrations rồi thêm dữ liệu demo. Chạy lại không xóa dữ liệu hoặc đổi mật khẩu tài khoản đã tồn tại.

Prisma migrations là nguồn cấu trúc database chính thức. Không dùng `prisma db push` thay cho bước này và không import `backend/database/schema.sql` vào database hiện tại; file SQL đó thuộc cấu trúc cũ.

### 4. Chạy API và frontend

Mở hai terminal tại thư mục gốc:

**Terminal 1 — API Node.js:**

```powershell
npm run backend:dev
```

**Terminal 2 — frontend:**

```powershell
npm run dev
```

| Dịch vụ | Địa chỉ |
| --- | --- |
| Giao diện | http://localhost:5173 |
| Kiểm tra API Node.js | http://localhost:5000/ |
| API chính | http://localhost:5000/api |
| phpMyAdmin, nếu dùng Docker | http://localhost:8080 |

API không tự khởi tạo toàn bộ database khi chạy `npm start`; cần hoàn thành bước 3 trước khi đăng nhập.

### 5. Đăng nhập bằng tài khoản demo

Sau khi `db:init` thành công:

| Email | Mật khẩu | Quyền |
| --- | --- | --- |
| `admin@plantravel.com` | `admin123456` | Admin |
| `an.nguyen.traveler@gmail.com` | `travel123456` | User |
| `linh.le.wanderlust@gmail.com` | `travel123456` | User |

Đây là tài khoản demo local. Nếu tài khoản đã có và được đổi mật khẩu, seed giữ nguyên mật khẩu đó. Xem thêm [hướng dẫn database](backend/database/README.md).

## Cập nhật mã nguồn trên máy đã cài

Dừng API và frontend bằng `Ctrl+C` trong các terminal đang chạy, rồi thực hiện từ thư mục gốc trên nhánh cần cập nhật:

```powershell
git pull --ff-only
npm run install:all
npm run db:generate
npm run db:migrate
```

Sau đó khởi động lại bằng `npm run backend:dev` và `npm run dev`. Với database đã có dữ liệu, dùng `db:migrate` để áp dụng migration mới; không cần seed lại. Bản hiện tại có migration `20261111160000_add_trip_expenses` để lưu từng khoản chi, người trả và người cùng chia.

## Bản đồ Geoapify

Khi tạo chuyến đi thủ công hoặc lấy gợi ý AI, backend dùng danh mục đã lưu của điểm đến; nếu có ít hơn 10 mục thì lấy thêm tối đa 40 địa điểm thật từ Geoapify và lưu vào database. Cơ chế này dùng cho điểm đến bất kỳ ở Việt Nam, không giới hạn các vùng đã nạp trước. Nếu nguồn không có địa điểm, không thay bằng dữ liệu của vùng khác.

Ô điểm đến có danh mục tên điểm đến Việt Nam để gợi ý ngay khi gõ, hỗ trợ cả có dấu và không dấu (ví dụ `đà` → Đà Nẵng, `vung` → Vũng Tàu). Tọa độ được lấy từ Geoapify theo tên điểm đến đã lưu. Bản đồ tự mở đúng vùng ngay cả khi lịch trình chưa có điểm dừng; tìm kiếm trên bản đồ chỉ định vị kết quả, chỉ nút “Thêm vào lịch trình” mới thêm điểm.

Bản đồ mặc định dùng chế độ Khám phá tổng hợp: lấy riêng tối đa 10 điểm cho mỗi nhóm tham quan, cà phê, ăn uống, vui chơi và thiên nhiên để các loại đông địa điểm không lấn át loại khác. Bộ lọc Loại địa điểm có thêm mua sắm/chợ và lưu trú; khi chọn riêng một loại, bản đồ lấy tối đa 40 điểm. Bấm ghim xanh để xem tên, địa chỉ, loại địa điểm và giờ mở cửa/điện thoại nếu nguồn có dữ liệu; bấm “Thêm vào lịch trình” để chọn điểm dừng. Sau khi kéo hoặc phóng bản đồ, bấm “Tìm trong vùng bản đồ” để lấy lại địa điểm (không tự gọi lại khi kéo để tiết kiệm credits). Chế độ tổng hợp gọi 5 lượt Places API, chọn riêng một nhóm gọi 1 lượt.

Điền `VITE_GEOAPIFY_API_KEY` trong `frontend/.env` để hiển thị bản đồ, tìm địa điểm tại Việt Nam và tính tuyến đường bằng Geoapify. Điền `GEOAPIFY_API_KEY` trong `backend/.env` cho chức năng lấy và lưu địa điểm theo khu vực. Khởi động lại frontend/backend sau khi đổi cấu hình; khi triển khai cần build lại frontend.

Key frontend được gửi tới trình duyệt: dùng key riêng, giới hạn theo HTTP referrer/tên miền trong Geoapify (cho phép localhost khi phát triển). Key backend nên dùng riêng và giới hạn theo IP máy chủ. Không commit file `.env`. Bản đồ, tìm kiếm và tuyến đường cùng tiêu thụ credits; dữ liệu địa điểm đã lưu vẫn được ưu tiên khi tìm kiếm.

## Dịch vụ Python AI/thời tiết — tùy chọn

Không cần chạy phần này để đăng ký, đăng nhập bằng mật khẩu, lập lịch thủ công hoặc quản lý ngân sách. Thời tiết thực tế cần dịch vụ Python và khóa OpenWeatherMap; khi dịch vụ không hoạt động, giao diện dùng trạng thái dự phòng, không có dữ liệu thời tiết xác thực.

Thêm các biến cần dùng vào **`backend/.env`**. Python đọc các biến `DB_*` riêng, nên chúng phải trỏ đến cùng database với `DATABASE_URL`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=travel_planner
OPEN_WEATHER_KEY=
GEMINI_API_KEY=
GEOAPIFY_API_KEY=
```

Điền `OPEN_WEATHER_KEY` để lấy thời tiết; `GEMINI_API_KEY` cho các API gọi Gemini; `GEOAPIFY_API_KEY` cho chức năng lấy địa điểm qua Geoapify ở API Node.js. Khi gọi Gemini, đặt thêm `GEMINI_MODEL` thành tên model mà khóa API của bạn hỗ trợ.

Mở terminal thứ ba từ thư mục gốc:

```powershell
cd backend/python_service
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r src/requirements.txt
cd src
..\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
```

Trên macOS/Linux, tạo môi trường bằng `python3.11 -m venv .venv`, dùng `.venv/bin/python` để cài requirements và `../.venv/bin/python` khi chạy từ `src/`.

Tài liệu API Python: `http://localhost:8001/docs`. Frontend hiện gọi dịch vụ này trên cổng `8001`; không dùng cổng `8000` trong hướng dẫn cũ. Dependencies có PyTorch và Sentence Transformers nên bước cài đặt/tải model có thể mất thời gian.

## Đăng nhập Google — tùy chọn

Đặt cùng một OAuth Client ID hợp lệ vào:

- `GOOGLE_CLIENT_ID` trong `backend/.env`.
- `VITE_GOOGLE_CLIENT_ID` trong `frontend/.env`.

Thêm origin frontend đang chạy, ví dụ `http://localhost:5173`, vào danh sách JavaScript origins của OAuth client trong Google Cloud Console. Khởi động lại API và Vite sau khi sửa `.env`.

Google login xác minh token thật ở backend; không có chế độ đăng nhập Google giả lập. Không cấu hình Google vẫn đăng ký/đăng nhập được bằng email và mật khẩu.

## Build và kiểm thử

```powershell
npm run build
npm run lint
npm test
```

Build frontend nằm trong `frontend/dist/`. `npm test` có các bài kiểm tra tích hợp cần MySQL và dữ liệu demo; nên chạy trên database local dành cho kiểm thử, đã áp dụng migrations và seed.

## Lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| Vite báo phiên bản Node không hỗ trợ | Chạy `node -v`; dùng Node 24 hoặc Node 22 từ 22.12 trở lên. |
| API không kết nối được MySQL | Kiểm tra MySQL đang chạy, cổng, mật khẩu và `DATABASE_URL` trong `backend/.env`. |
| Thiếu bảng hoặc cột `expenses` | Chạy `npm run db:migrate`; với máy mới, chạy đủ các bước khởi tạo database. |
| Prisma generate báo `EPERM` trên Windows | Dừng tiến trình API đang dùng Prisma Client bằng `Ctrl+C`, chạy lại `npm run db:generate`, rồi khởi động lại API. |
| Cổng `5000`, `5173` hoặc `8001` bị chiếm | Kiểm tra terminal đang chạy dịch vụ trùng; dừng bản chạy cũ trước khi khởi động lại. |
| Frontend báo lỗi API/CORS | `VITE_API_URL` phải có đuôi `/api`; `FRONTEND_URL` phải khớp origin frontend, kể cả `localhost` hoặc `127.0.0.1`. Khởi động lại sau khi đổi `.env`. |
| Thời tiết không có dữ liệu | Kiểm tra Python ở cổng `8001` và `OPEN_WEATHER_KEY`. |

## Cấu trúc thư mục

```text
Plan_Travel/
├── frontend/                   # React, Vite và frontend/.env
├── backend/
│   ├── src/                    # Express API, services và scripts
│   ├── prisma/                 # Schema và migrations
│   ├── tests/                  # Kiểm thử Node.js/frontend và tích hợp MySQL
│   ├── python_service/src/     # FastAPI: main.py, requirements.txt, ai/
│   ├── database/README.md      # Hướng dẫn database và seed
│   ├── compose.yml            # MySQL + phpMyAdmin
│   └── .env                   # Cấu hình API và dịch vụ Python
├── package.json               # Các lệnh chạy từ thư mục gốc
└── README.md
```
