# PlanTravel mobile — nghiên cứu và thiết kế

Ngày nghiên cứu: 26/11/2026. Nền tảng triển khai: Flutter, Android Material 3.

## Nguồn tham khảo

- [Facebook: Feed, tìm kiếm và điều hướng, tháng 12/2025](https://about.fb.com/news/2025/12/making-it-easier-to-create-discover-and-share-content-on-facebook/): đọc mô tả thay đổi về nội dung hình ảnh và các chức năng thường dùng trên thanh tab. Áp dụng phân cấp nội dung rõ và điều hướng trực tiếp; không thêm bảng tin mạng xã hội vào ứng dụng khi chưa có chức năng tương ứng.
- [Airbnb: thiết kế ứng dụng tháng 5/2025](https://news.airbnb.com/product-releases/airbnb-2025-summer-release): đọc phần Explore, Trips và Profile; xem ảnh Explore, Trips, Profile, danh sách Experiences và lịch trình trải nghiệm. Áp dụng tách khám phá khỏi chuyến đi cá nhân, ô tìm kiếm dễ thấy, ảnh điểm đến, thông tin cô đọng và lịch trình theo trục thời gian.
- [Ảnh Explore gốc](https://news-assets.withairbnb.com/wp-content/uploads/sites/21/2025/05/All-new-app-US.jpg), [ảnh Trips gốc](https://news-assets.withairbnb.com/wp-content/uploads/sites/21/2025/05/Trips-tab-US.jpg), [ảnh Profile gốc](https://news-assets.withairbnb.com/wp-content/uploads/sites/21/2025/05/Guest-profile-US.jpg).

Appllama MCP không có trong phiên này; nghiên cứu sử dụng nguồn công khai chính thức. Các ảnh tham khảo chỉ dùng nghiên cứu; tài sản trong app là các ảnh điểm đến đã có trong dự án.

## Quyết định thiết kế

- Năm tab ngang cấp: Trang chủ, Khám phá, Chuyến đi, Bản tin, Cá nhân; menu trượt giữ các mục dành cho du khách từ web. Trạng thái bộ lọc và vị trí cuộn được giữ khi chuyển tab.
- Khám phá: tìm trong mười điểm đến lấy từ danh mục web, hỗ trợ nhập không dấu, ảnh mở đầu, danh sách điểm đến, hành trình cá nhân. Đây là nội dung biên tập cố định, không phải đề xuất cá nhân hóa từ máy chủ.
- Chạm điểm đến mở bottom sheet; nút lập kế hoạch đóng sheet rồi mở form với điểm đến được điền sẵn. Back từ form trả về màn hình trước đó.
- Chuyến đi: các bộ lọc Tất cả, Đang đi, Sắp tới, Đã kết thúc; chuyến đang đi đứng trước. Bộ lọc áp dụng trên dữ liệu đã tải; nút tải thêm vẫn hiện nếu máy chủ còn trang.
- Cá nhân: thông tin tài khoản thật, truy cập chuyến đi, giải thích quyền chia sẻ vị trí và đăng xuất.
- Theo phản hồi giảm độ chói: màu nhấn xanh sage trầm `#4F685D`, nền xám xanh `#EEF1ED`, thẻ trắng ngà `#F6F7F3`, chữ than xanh `#303C33`, viền nhẹ `#D4DDD2`. Chế độ tối dùng nền `#191E1B` và xanh nhấn giảm bão hòa. Giữ thẻ 16px, bìa ảnh 24px, nút Material và sáng/tối theo hệ thống.
- Không hiển thị dữ liệu minh họa như dữ liệu tài khoản thật. Các màn hình mới từ web mang nhãn bản mẫu và không gửi/lưu dữ liệu. Ảnh trong thẻ chuyến đi được ghi rõ là minh họa điểm đến.
- Giữ luồng API, xác thực, thực hiện chuyến đi và dịch vụ chia sẻ vị trí hiện có.

## Xem bản mẫu riêng

Trong thư mục `mobile/`:

```powershell
flutter run -t tool/design_preview.dart
```

Bản này có nhãn **BẢN MẪU**, dữ liệu minh họa riêng, không gọi backend hay đăng nhập, không bật chia sẻ vị trí. Khám phá, tìm điểm đến, sheet, bộ lọc và chuyển tab hoạt động; thao tác lưu/xem chuyến đi chỉ giải thích đây là bản mẫu. App chính chạy bằng `flutter run --dart-define-from-file=.env` và vẫn dùng dữ liệu tài khoản thật.

## Kiểm tra

- `flutter analyze --no-pub`: không có vấn đề.
- `flutter test --no-pub`: cả 10 kiểm thử qua; gồm hồi quy hiện có và luồng chọn điểm đến → form điền sẵn → quay lại → lọc chuyến → cá nhân → giữ bộ lọc. Kiểm tra ở 320px, chữ 150%, cả sáng và tối.
- `flutter build apk --debug --no-pub`: build app chính thành công.
- Chạy bản mẫu trên máy ảo Pixel 7, chụp và xem trực tiếp Khám phá sáng/tối, Chuyến đi, Cá nhân và sheet điểm đến. Ảnh nằm cùng thư mục tài liệu này; video thao tác mẫu là `preview-flow.mp4`. Đây không phải phép đo hiệu năng release hoặc kiểm thử trên điện thoại thật.

## Đồng bộ từ web

| Phần trên web | Mobile |
|---|---|
| Logo chữ và biểu tượng P | Logo gốc trong header, menu, đăng nhập; bản đơn sắc trên nền tối/ảnh; biểu tượng Android, splash và icon thông báo |
| Dashboard | Trang chủ, lối vào hai cách lập kế hoạch, thống kê rõ phạm vi dữ liệu đã tải, chuyến đang thực hiện |
| Khám phá | 10 điểm đến, ảnh gốc, mô tả, các điểm tham quan và nguồn tham khảo từ web; tìm không dấu; điền sẵn điểm đến vào form thật |
| Danh sách/chi tiết chuyến đi | Giữ API và luồng native hiện có |
| AI | Mẫu form điểm đến, số ngày, số người, ngân sách, sở thích và bố cục lịch trình; chưa gọi AI hay lưu |
| Bản tin chuyến đi | Mẫu feed có lọc điểm đến và loại trải nghiệm, nội dung và lịch trình minh họa; chưa đăng/bình luận/sao chép qua API |
| Cơ sở du lịch / Business | Mẫu tìm kiếm, loại hình, trạng thái trống và form đăng ký; chưa gửi hồ sơ |
| Hồ sơ, thông báo, tin nhắn | Mẫu các màn hình và tùy chọn tương ứng; không sửa tài khoản hay gửi tin |
| Nguồn ảnh | Giữ nguyên tác giả, giấy phép và URL từ trang credits của web trong app |

Phạm vi lần này là đồng bộ **giao diện mẫu**, theo mạch thiết kế đang thực hiện. Các tính năng quản trị và quản lý cơ sở dành cho vai trò admin/business chưa được chuyển sang Flutter.
