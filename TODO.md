# TODO - Sắp xếp lịch trình chi tiết theo ngày (an toàn, không phá chức năng)

- [x] Đọc và phân tích `frontend/src/pages/PlannerWizard.jsx`
  - [x] Xác nhận format note khi lưu AI plan có chứa marker ngày
- [x] Kiểm tra `frontend/src/context/TripContext.jsx`
  - [x] Parse day từ note marker (`[DAY:x]`)
  - [x] Giữ `items` đã normalize để dùng cho view theo ngày
- [x] Cập nhật `frontend/src/pages/TripDetails.jsx` theo hướng an toàn
  - [x] Tách helper parse/group tránh gọi hàm trước khi khởi tạo
  - [x] Nhóm địa điểm theo ngày từ `trip.items` ở mode xem thường
  - [x] Fallback danh sách cũ khi thiếu `trip.items`
  - [x] Giữ nguyên flow chỉnh sửa timeline
- [x] Kiểm tra logic weather khi click item theo ngày
- [x] Chạy critical-path testing sau khi sửa
