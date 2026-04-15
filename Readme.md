# 🌍 PlanTravel - Ứng dụng Lập kế hoạch Du lịch

[![React](https://img.shields.io/badge/React-19-brightgreen)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-orange)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-blue)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8-purple)](https://mysql.com/)

**PlanTravel** là ứng dụng web **full-stack** giúp người dùng **lập kế hoạch du lịch cá nhân hóa**, quản lý lịch trình chuyến đi với bản đồ tương tác. Hỗ trợ tiếng Việt, giao diện hiện đại với animation mượt mà.

## ✨ Tính năng chính

- **🔐 Xác thực người dùng**: Đăng nhập/đăng ký/quản lý profile
- **📊 Dashboard**: Tổng quan chuyến đi, thống kê, điểm đến hot
- **🗺️ Lập kế hoạch chuyến đi**:
  - Thêm địa điểm bằng click/tìm kiếm trên bản đồ
  - Sắp xếp thứ tự bằng drag & drop
  - Chi tiết: tên chuyến, ngày đi, ghi chú
- **📋 Quản lý lịch sử**: Xem chi tiết chuyến đi đã lưu
- **🗺️ Bản đồ tương tác**: Leaflet + React-Leaflet
- **🌤️ Dự báo thời tiết**: Tích hợp Weather API
- **🤖 Gợi ý thông minh**: Python ML (Recommendation/Weather/Search - đang phát triển)

## 🛠️ Tech Stack

| Phần | Công nghệ |
|------|-----------|
| **Frontend** | React 19, Vite, React Router, Framer Motion, TailwindCSS, Lucide React, Leaflet |
| **Backend** | Node.js, Express.js, MySQL (Geospatial support), CORS |
| **AI/ML** | Python (Recommendation, Weather API, Jupyter) |
| **DevOps** | Docker Compose |
| **State** | React Context (Auth/Trip) |

## 🚀 Cài đặt & Chạy

### 1. Backend (API + DB)
```bash
cd "Back End"
npm install
# Tạo DB MySQL, import schema nếu có
npm start  # Chạy port 8000 (process.env.PORT)
```

### 2. Frontend
```bash
cd "Fornt End/Plan_travel"
npm install
npm run dev  # http://localhost:5173
```

### 3. Docker (Tùy chọn)
```bash
docker-compose up
```

**Lưu ý**: 
- Folder frontend có typo: `Fornt End` → nên rename thành `Front End`
- Backend hiện chỉ có API locations, cần mở rộng trips/users
- Python scripts cần integrate vào API

## 📁 Cấu trúc dự án
```
Plan_Travel/
├── Readme.md                 # Tài liệu này
├── Back End/                 # Node.js API
│   ├── Database/             # MySQL server + db.js
│   └── src/                  # Python ML scripts
├── Fornt End/Plan_travel/    # React App
│   ├── src/pages/            # Login, Dashboard, TripPlanner...
│   ├── src/Components/Map/   # Interactive Map
│   └── src/context/          # Auth/Trip contexts
└── Docker-compose.yml
```

## 🛣️ Roadmap
- [x] Frontend UI hoàn chỉnh
- [x] Backend locations API
- [ ] Full CRUD trips/users
- [ ] Integrate Python AI recommendations
- [ ] Mobile responsive
- [ ] Deploy (Vercel + Railway)

## 🤝 Đóng góp
1. Fork repo
2. Tạo branch `feature/xxx`
3. PR vào `main`

**Liên hệ**: [Your info]

---

*Built with ❤️ for travel lovers* 🇻🇳✈️"

