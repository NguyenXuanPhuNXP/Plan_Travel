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
