<<<<<<< HEAD
# 🌍 PlanTravel - Ứng dụng Lập kế hoạch Du lịch AI

[![React](https://img.shields.io/badge/React-19-brightgreen)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-orange)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-blue)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8-purple)](https://mysql.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-yellow)](https://ai.google.dev/)

**PlanTravel** là ứng dụng web **full-stack** giúp người dùng **lập kế hoạch du lịch cá nhân hóa** với sự hỗ trợ của **AI (Gemini)**, quản lý lịch trình chuyến đi với bản đồ tương tác, timeline chỉnh sửa trực tiếp, và chia sẻ lịch trình.

## ✨ Tính năng chính

- **🔐 Xác thực người dùng**: Đăng nhập/đăng ký/quản lý profile (JWT)
- **📊 Dashboard**: Tổng quan chuyến đi, thống kê, điểm đến hot
- **🤖 AI Gợi ý thông minh**:
  - Nhập địa điểm → AI gợi ý những nơi nên đi
  - Tự động tạo lịch trình theo ngày (Gemini AI)
  - Xếp hạng địa điểm theo sở thích, ngân sách
- **🗺️ Lập kế hoạch chuyến đi (Wizard 3 bước)**:
  - Bước 1: Nhập địa điểm, số ngày, ngân sách, sở thích
  - Bước 2: Chọn từ danh sách gợi ý AI + bản đồ tương tác
  - Bước 3: Chỉnh sửa timeline (kéo thả, inline edit thời gian/ghi chú)
- **📋 Timeline trực quan**: Drag & drop, đánh dấu, chỉnh sửa tại chỗ
- **🗺️ Bản đồ tương tác**: Leaflet + markers phân biệt (gợi ý/đã chọn)
- **🔗 Chia sẻ lịch trình**:
  - Public plan (link chia sẻ cho mọi người xem)
  - Collaborative plan (mời người khác cùng chỉnh sửa)
- **🌤️ Dự báo thời tiết**: Tích hợp Weather API

## 🛠️ Tech Stack

| Phần | Công nghệ |
|------|-----------|
| **Frontend** | React 19, Vite 8, React Router, Framer Motion, Leaflet, Lucide React |
| **Backend** | Node.js, Express.js, Prisma ORM, MySQL |
| **AI** | Google Gemini AI (gợi ý + tạo lịch trình) |
| **Maps** | Leaflet + React-Leaflet, Geoapify API, OSRM Routing |
| **Auth** | JWT (Access + Refresh tokens), BCrypt |
| **DevOps** | Docker Compose |

## 🚀 Cài đặt & Chạy

### 1. Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push    # Đồng bộ schema với MySQL
npm run dev           # http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

### 3. Cấu hình .env (backend/.env)
```env
PORT=5000
DATABASE_URL="mysql://root:password@localhost:3306/travel_planner"
GEOAPIFY_API_KEY=your_key
JWT_SECRET=your_secret
GEMINI_API_KEY=your_gemini_key   # Tùy chọn, để trống vẫn chạy (rule-based fallback)
```

### 4. Docker (Tùy chọn)
```bash
docker-compose up
```

## 📁 Cấu trúc dự án
```
Plan_Travel/
├── backend/                      # Node.js API
│   ├── src/
│   │   ├── server.js             # Entry point
│   │   ├── config/               # DB, regions
│   │   ├── routes/               # Auth, Locations, Itineraries, Suggestions, Sharing
│   │   ├── services/             # Business logic + AI
│   │   ├── middleware/           # Auth JWT
│   │   └── scripts/              # Seed data
│   ├── prisma/schema.prisma      # Database schema
│   └── .env
├── frontend/                     # React App
│   └── src/
│       ├── pages/                # PlannerWizard, Dashboard, TripDetails, SharedView...
│       ├── Components/           # Map, Layout
│       ├── context/              # Auth, Trip (backend-connected)
│       ├── services/             # API clients
│       └── hooks/                # Geolocation
├── docker-compose.yml
└── README.md
```

## 🛣️ Roadmap
- [x] Frontend UI hoàn chỉnh
- [x] Backend Auth API (JWT)
- [x] Backend Locations API (Geoapify)
- [x] AI Suggestion Service (Gemini)
- [x] Itinerary CRUD API
- [x] Timeline Editor (drag & drop)
- [x] Public/Collaborative sharing
- [x] Folder restructure (backend/frontend)
- [ ] Mobile responsive optimization
- [ ] Deploy (Vercel + Railway)
- [ ] Notification system

---

*Built with ❤️ for travel lovers* 🇻🇳✈️
=======
# 🧭 PLAN TRAVEL (LỮ HÀNH) - SỔ TAY KHÁM PHÁ & LẬP LỊCH TRÌNH VIỆT NAM

> Nền tảng lập kế hoạch du lịch thông minh, tối ưu lộ trình và ghi lại nhật ký hành trình qua các địa danh Việt Nam.

---

## 🏗️ 1. Kiến Trúc Hệ Thống (Tech Stack)

* **Frontend**: React 19, Vite, Framer Motion, Leaflet & React-Leaflet, Lucide Icons, Date-fns.
* **Backend API**: Node.js, Express, MySQL2, JWT, Bcryptjs, Google Auth Library.
* **Weather & Search Microservice**: Python FastAPI, OpenWeatherMap API, Sentence-Transformers.
* **Cơ sở dữ liệu (Database)**: MySQL 8.0+ (hỗ trợ kiểu dữ liệu không gian `POINT SRID 4326`).

---

## 🗄️ 2. Hướng Dẫn Chạy Cơ Sở Dữ Liệu (MySQL Database)

Dự án sử dụng **MySQL** để lưu trữ người dùng, phân loại và các địa điểm du lịch.

### 2.1. Cấu hình biến môi trường kết nối Database
Thông tin kết nối nằm trong file `Back End/.env` (hoặc `Back End/Database/.env`):

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=travel_planner
PORT=5000
JWT_SECRET=travel_planner_secret_jwt_key_2026
```

> **Lưu ý quan trọng**: Nên dùng `DB_HOST=127.0.0.1` thay vì `localhost` để tránh lỗi phân giải IPv6 (`::1`) trên Windows với Node.js.

---

### 2.2. Cơ chế Tự Động Khởi Tạo (Auto-Migration & Seeding)

Hệ thống đã được tích hợp **cơ chế tự động 100%**:
* Khi bạn khởi động Backend (`npm start`), server sẽ tự động kiểm tra kết nối tới MySQL.
* Nếu database `travel_planner` chưa có bảng, server sẽ **tự động tạo các bảng**:
  * `users`: Lưu thông tin tài khoản người dùng (hỗ trợ cả Email/Mật khẩu và Google OAuth).
  * `categories`: Danh mục địa điểm (Di tích, Thắng cảnh, Ẩm thực...).
  * `locations`: Tọa độ địa lý kinh độ, vĩ độ và điểm không gian `geo_point`.
* Tự động **chèn dữ liệu mẫu (Seeding)** các danh lam thắng cảnh tiêu biểu (Hồ Hoàn Kiếm, Văn Miếu, Lăng Bác...).

---

### 2.3. Các cách chạy MySQL trên máy của bạn

#### 👉 Cách 1: Sử dụng MySQL Service có sẵn trên Windows (Khuyên dùng)
Máy tính của bạn đã có dịch vụ `MySQL80` cài sẵn:
1. Kiểm tra trạng thái dịch vụ (mở PowerShell):
   ```powershell
   Get-Service -Name *mysql*
   ```
2. Nếu trạng thái chưa phải `Running`, khởi động dịch vụ:
   ```powershell
   Start-Service -Name MySQL80
   ```
3. Đảm bảo mật khẩu tài khoản `root` trùng khớp với `DB_PASSWORD` trong file `.env` (mặc định là `123456`).

#### 👉 Cách 2: Sử dụng Docker Compose (Nếu máy cài Docker)
Dự án đã có sẵn file `Docker-compose.yml` chuẩn:
1. Mở terminal tại thư mục gốc của dự án:
   ```bash
   docker compose up -d
   ```
2. Lệnh trên sẽ tự động:
   * Chạy container **MySQL 8.0** trên cổng `3306`.
   * Tự động nạp cấu trúc database từ file `Back End/Database/schema.sql`.
   * Chạy **phpMyAdmin** tại `http://localhost:8080` (Tài khoản: `root`, Mật khẩu: `123456`) để bạn xem và quản lý bảng trực quan trên web.

#### 👉 Cách 3: Nạp thủ công bằng file SQL (MySQL Workbench / XAMPP / Laragon)
Nếu bạn muốn tự tạo thủ công:
* Toàn bộ câu lệnh DDL và dữ liệu mẫu đã được lưu tại: [`Back End/Database/schema.sql`](Back%20End/Database/schema.sql).
* Mở **MySQL Workbench** hoặc **phpMyAdmin** ➔ Mở file `schema.sql` và nhấn **Execute**.

---

### 2.4. Cơ Chế Dự Phòng Thông Minh (In-Memory Fallback)

Nếu bạn chưa bật MySQL hoặc MySQL bị lỗi mật khẩu:
* Backend **sẽ không bị crash** (không văng lỗi 500).
* Hệ thống tự động chuyển sang chế độ **Bộ nhớ đệm (In-Memory Fallback)** để lưu session tạm thời.
* Bạn vẫn có thể trải nghiệm toàn bộ giao diện, lập kế hoạch, test chức năng đăng nhập thường và Đăng nhập bằng Google bình thường mà không bị gián đoạn.

---

## 📊 3. Cấu Trúc Bảng Dữ Liệu (Database Schema)

```mermaid
erDiagram
    USERS ||--o{ TRIPS : "tạo"
    CATEGORIES ||--o{ LOCATIONS : "phân loại"
    TRIPS ||--o{ TRIP_LOCATIONS : "chứa"
    LOCATIONS ||--o{ TRIP_LOCATIONS : "tham chiếu"

    USERS {
        int id PK
        string google_id "Định danh Google"
        string email "Email người dùng"
        string password_hash "Mật khẩu mã hóa bcrypt"
        string name "Tên lữ khách"
        text avatar "Ảnh đại diện"
        string role "user / admin"
        string auth_provider "local / google"
    }

    CATEGORIES {
        int id PK
        string name "Tên danh mục"
        string description "Mô tả"
    }

    LOCATIONS {
        int id PK
        string name "Tên địa điểm"
        string address "Địa chỉ"
        decimal latitude "Vĩ độ"
        decimal longitude "Kinh độ"
        point geo_point "Tọa độ không gian SRID 4326"
        int category_id FK
    }

    TRIPS {
        string id PK
        int user_id FK
        string title "Tên chuyến đi"
        date start_date "Ngày bắt đầu"
        date end_date "Ngày kết thúc"
        string status "upcoming / ongoing / completed"
    }

    TRIP_LOCATIONS {
        int id PK
        string trip_id FK
        decimal latitude
        decimal longitude
        int stop_order "Thứ tự trạm dừng"
    }
```

---

## 🚀 4. Hướng Dẫn Khởi Chạy Toàn Bộ Dự Án

### Bước 1: Khởi động Backend API (Port 5000)
Mở Terminal 1:
```powershell
cd "F:\DuAn\Plan_Travel\Back End"
npm start
```
*Kết quả thông báo thành công:*
```text
🚀 Plan Travel Backend running on http://localhost:5000
✅ MySQL Database connected successfully (127.0.0.1:3306).
✅ Tables (users, categories, locations) ready in MySQL.
```

### Bước 2: Khởi động Weather Microservice (Python FastAPI - Port 8000)
Mở Terminal 2 (tùy chọn, phục vụ lấy dữ liệu thời tiết thực tế):
```powershell
cd "F:\DuAn\Plan_Travel\Back End\src"
python -m uvicorn Weather:app --reload --port 8000
```

### Bước 3: Khởi động Frontend (React 19 - Port 5173)
Mở Terminal 3:
```powershell
cd "F:\DuAn\Plan_Travel\Fornt End\Plan_travel"
npm run dev
```

Truy cập trình duyệt tại: **`http://localhost:5173`** để bắt đầu trải nghiệm!

---

## 🔑 5. Cấu Hình Đăng Nhập Bằng Google (Google OAuth)

1. Mặc định trong môi trường phát triển: Nút **"Tiếp tục với Google"** trên giao diện hỗ trợ chế độ tương tác một chạm (Google One-Tap Simulator), cho phép chọn tài khoản Google mẫu để đăng nhập ngay lập tức.
2. Khi muốn kích hoạt tài khoản Google thật:
   * Lấy `Client ID` từ [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   * Điền vào file `Fornt End/Plan_travel/.env`:
     ```env
     VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     ```
   * Hệ thống sẽ tự động chuyển sang luồng xác thực chính thức của Google.
>>>>>>> 9e24a6f (update giao diện)
