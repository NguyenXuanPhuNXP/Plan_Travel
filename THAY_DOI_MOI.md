# Các thay đổi mới — PlanTravel

Đợt cập nhật tháng 11/2026 trên nhánh `Dung`, hợp nhất vào `Develops`. Hướng dẫn cài đặt và sử dụng nằm trong [Readme.md](Readme.md).

## 1. Landing page

- `/` trở thành trang giới thiệu công khai; bảng điều khiển chuyển sang `/dashboard` và cần đăng nhập.
- Video nền Hạ Long có bản riêng nhẹ hơn cho điện thoại, ảnh dự phòng và nút tạm dừng.
- Bản đồ Việt Nam minh họa với hành trình Hạ Long → Hội An → Phú Quốc, hiệu ứng theo cả hai hướng cuộn.
- Hiệu ứng chữ, ảnh và cảnh kết thúc được làm mềm bằng spring/transform; hạn chế cập nhật React theo từng khung hình.
- Tôn trọng chế độ giảm chuyển động; màn hình điện thoại thấp dùng bố cục cuộn thông thường. Landing không hiển thị box chat.
- Ghi nguồn ảnh, video và dữ liệu bản đồ tại `frontend/public/images/credits.html`; sửa phân cấp chữ trang ghi nguồn.

## 2. Planner thống nhất giao diện

- Planner thủ công và AI dùng chung phần giới thiệu, ảnh điểm đến, hệ màu xanh rừng/cam và bố cục biểu mẫu.
- Đồng bộ bộ chọn địa điểm và trình chỉnh lịch trình; cải thiện bố cục di động và ô chọn giờ.
- Bỏ hai nút “Cùng AI / Tự lên lịch” trong phần giới thiệu theo yêu cầu; điều hướng hai chế độ qua sidebar.
- Ô “Địa điểm muốn đi” hiện sáu gợi ý khi trống, lọc tên có dấu/không dấu, cho chọn bằng bàn phím và vẫn hỗ trợ nhập tự do.
- Khi chuyển qua đăng nhập từ trang lập lịch, giữ đường dẫn và điểm đến đang chọn.

## 3. Khám phá điểm đến

- Thêm 44 địa danh thuộc 11 điểm đến trong mục “Những nơi không nên bỏ lỡ”.
- Mỗi địa danh có mô tả ngắn, liên kết bản đồ và nguồn tham khảo; không tạo giá, xếp hạng hay tọa độ giả.
- Tránh phản hồi tải chi tiết cũ ghi đè một địa điểm vừa được chọn khác.

## 4. Chia sẻ kế hoạch và bản tin

- Thêm `/community`, liên kết trên landing/sidebar và thao tác chia sẻ từ phần quản lý chuyến đi.
- Bài mới bắt buộc chọn kế hoạch đã tạo của chính người đăng. Cảm nhận là tùy chọn; ngày trải nghiệm không được ở tương lai.
- Công khai bản chụp lịch trình gồm tên, điểm đến, ngày, số người, phương tiện, ngân sách dự kiến, điểm dừng, giờ và địa chỉ/liên kết bản đồ.
- Không đính kèm ghi chú riêng, chi tiêu thực tế, thành viên hoặc trò chuyện. Sửa bản riêng không tự đổi bài đã đăng.
- Hiển thị toàn bộ lịch trình trực tiếp trong bài và phần xem trước; hiện đủ ngày, kể cả ngày chưa lưu điểm dừng. Không bịa thêm địa điểm cho kế hoạch trống.
- Ẩn thanh scrollbar trong khung chia sẻ, vẫn cho cuộn bằng chuột, bàn phím và cảm ứng; nút đóng phần chi tiết luôn tiếp cận được.
- Chủ bài được sửa/xóa; khách được xem; người đăng nhập bình luận và đánh giá 1–5 sao. Mỗi người có một đánh giá có thể sửa/gỡ, không tự chấm bài của mình.
- Có phân trang, phản hồi lỗi và giữ nội dung biểu mẫu khi lưu thất bại.

## 5. Ảnh chuyến đi

- Chọn tối đa 8 file JPG/PNG/WebP, xem trước, bỏ ảnh; ảnh đầu tiên làm bìa.
- Trình duyệt thu nhỏ ảnh về tối đa 2000px và chuyển JPEG trước khi gửi.
- API kiểm tra định dạng thực, kích thước và dung lượng; đặt tên ngẫu nhiên, không nhận đường dẫn file tùy ý.
- Ảnh lưu trong `backend/uploads/community/`; xóa ảnh bị bỏ và ảnh thuộc bài bị xóa, dọn file mới khi lưu thất bại.
- Kiểm tra phiên bản danh sách ảnh để tránh cập nhật đồng thời khôi phục liên kết đến file đã xóa.

## 6. Database và các điểm cần cập nhật

| Migration | Mục đích |
| --- | --- |
| `20261112180000_trip_community` | Bài chia sẻ, bình luận và đánh giá |
| `20261112193000_community_photos` | Danh sách ảnh của bài chia sẻ |

Chạy `npm run db:generate` và `npm run db:migrate` sau khi lấy mã mới; dừng API trước bước generate trên Windows. Giữ nguyên các migration khác trên `Develops`. Sao lưu MySQL **và** thư mục `backend/uploads` khi chuyển máy/chạy máy chủ.

## 7. Kiểm tra và giới hạn

- Có kiểm thử lưu dữ liệu, quyền tác giả/bình luận, riêng tư bản chụp, đánh giá duy nhất, phân trang, ảnh hợp lệ/không hợp lệ, dọn file và cập nhật đồng thời.
- Kiểm thử frontend cho gợi ý điểm đến, kế hoạch theo ngày, route đăng nhập và ẩn chat trên landing.
- Đã kiểm tra giao diện desktop/mobile bằng trình duyệt, chọn file thực, xem bằng tài khoản khác và khách; các dữ liệu kiểm thử mới được dọn sau kiểm tra.
- Hai kiểm thử tìm bạn cũ được sửa để so khớp tên tiếng Việt không phân biệt dấu giống MySQL, thay vì phụ thuộc một người dùng demo phải nằm trong 30 kết quả mới nhất. Không đổi chức năng tìm bạn.
- Chưa đo FPS trên điện thoại thật hoặc thử tải production. Ảnh dùng lưu trữ file trên máy chủ, cần ổ đĩa bền vững khi triển khai.
