# 🔐 PLAN TRAVEL — ĐĂNG NHẬP GOOGLE ONE TAP

> Hướng dẫn cấu hình và kiểm tra chức năng đăng nhập nhanh bằng tài khoản Google.

---

## ✨ 1. Chức năng đã bổ sung

Trang **Đăng nhập** hỗ trợ hai cách đăng nhập bằng Google:

* **Google One Tap**: Hiển thị lời mời đăng nhập khi người dùng mở trang và trình duyệt cho phép.
* **Nút Google chính thức**: Cho phép người dùng chủ động chọn tài khoản Google.

Backend xác minh token do Google cấp trước khi tạo phiên đăng nhập của PlanTravel. Nếu xác minh thất bại, hệ thống hiển thị lỗi và không tạo phiên đăng nhập giả.

Chức năng được bổ sung ở cả hai thư mục giao diện:

| Thư mục | Cách sử dụng |
|---|---|
| `Front End/Plan_travel` | Giao diện được chạy bằng `npm run dev` tại thư mục gốc |
| `frontend` | Giao diện được chạy trực tiếp bằng `npm --prefix frontend run dev` |

Luồng đăng nhập bằng email và mật khẩu được giữ nguyên. Hộp chọn tài khoản Google giả lập trên trang **Đăng ký** vẫn thuộc phần code cũ, không phải chức năng One Tap mới.

---

## ⚙️ 2. Cấu hình Google OAuth

### Bước 1: Tạo Client ID

1. Mở [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Cấu hình màn hình chấp thuận OAuth và tài khoản thử nghiệm nếu ứng dụng đang ở chế độ thử nghiệm.
3. Tạo OAuth Client ID với loại **Web application**.
4. Thêm `http://localhost:5173` vào **Authorized JavaScript origins**. Khi triển khai, thêm địa chỉ HTTPS của ứng dụng.

> **Lưu ý:** Cần Client ID thật do Google cấp. Giá trị mẫu có đuôi `.apps.googleusercontent.com` không đủ để đăng nhập. Luồng này không cần Client Secret.

### Bước 2: Cấu hình Frontend

Tạo hoặc cập nhật file `Front End/Plan_travel/.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=client-id-do-google-cap.apps.googleusercontent.com
```

Nếu chạy giao diện trong thư mục `frontend`, đặt cấu hình tương ứng tại `frontend/.env.local`.

### Bước 3: Cấu hình Backend

Tạo hoặc cập nhật file `backend/.env`:

```env
GOOGLE_CLIENT_ID=client-id-do-google-cap.apps.googleusercontent.com
FRONTEND_ORIGIN=http://localhost:5173
```

Hai biến `GOOGLE_CLIENT_ID` và `VITE_GOOGLE_CLIENT_ID` phải sử dụng **cùng một Client ID**. Backend cũng cần `JWT_SECRET` và kết nối MySQL hiện có của dự án. Giữ nguyên các giá trị đang sử dụng; nếu chưa cấu hình thì bổ sung theo môi trường trên máy.

Sau khi sửa biến môi trường, khởi động lại cả Frontend và Backend.

---

## 🚀 3. Khởi chạy

Tại thư mục gốc của dự án, cài các gói cần thiết:

```powershell
npm --prefix backend install
npm --prefix "Front End/Plan_travel" install
```

Mở Terminal 1 để chạy Backend mới:

```powershell
npm run backend:dev
```

Mở Terminal 2 để chạy Frontend:

```powershell
npm run dev
```

Truy cập **`http://localhost:5173/login`** để kiểm tra.

> **Lưu ý:** Chức năng One Tap mới sử dụng thư mục `backend`. Lệnh `npm run backend:legacy` chạy Backend cũ và không sử dụng phần bổ sung này.

---

## 🗄️ 4. Lưu tài khoản và bảo toàn dữ liệu

* Hệ thống xác minh chữ ký, Client ID, đơn vị phát hành, thời hạn token, email đã xác nhận và mã xác thực của phiên đăng nhập.
* Tài khoản Google được nhận diện bằng `sub`, là mã định danh ổn định do Google cấp.
* Ở lần đăng nhập Google hợp lệ đầu tiên, Backend tạo thêm bảng `google_auth_identities` bằng `CREATE TABLE IF NOT EXISTS`. Tài khoản MySQL cần quyền tạo bảng cho thao tác này.
* Phần bổ sung không thay đổi cấu trúc các bảng đang có, không xóa dữ liệu và không yêu cầu đặt lại database hoặc tạo lại Prisma Client.
* Khi liên kết tài khoản Gmail hoặc Google Workspace đã có, hệ thống giữ nguyên mật khẩu, vai trò và hồ sơ của tài khoản PlanTravel.
* Nếu tài khoản đã có sử dụng email bên ngoài Gmail/Workspace, hệ thống yêu cầu đăng nhập bằng mật khẩu thay vì tự liên kết chỉ dựa trên email.
* Tài khoản mới được cấp vai trò `user`, không có mật khẩu. Nếu dùng đăng nhập mật khẩu cho tài khoản này, hệ thống trả về lỗi xác thực thay vì lỗi máy chủ.
* Tài khoản bị vô hiệu hóa không được cấp phiên đăng nhập Google.

Giao diện đang chạy lưu phiên đăng nhập theo cấu trúc hiện có và bổ sung access token, refresh token để các API lịch trình, bạn bè và chat sử dụng phiên xác thực thật.

---

## 🧪 5. Kiểm tra chức năng

Chạy kiểm thử riêng cho Google:

```powershell
node --test backend/tests/googleAuth.test.js
```

Kiểm tra build của hai giao diện:

```powershell
npm run build
npm --prefix frontend run build
```

Các tình huống kiểm thử gồm: đăng nhập lần đầu, đăng nhập lại bằng cùng tài khoản Google, giữ nguyên tài khoản đã có, token giả, sai Client ID, sai đơn vị phát hành, token hết hạn, email chưa xác nhận, sai mã xác thực, tài khoản bị khóa và thiếu cấu hình.

Sau khi cấu hình Client ID thật và MySQL, kiểm tra trực tiếp:

1. Mở trang đăng nhập và thử One Tap hoặc nút Google chính thức.
2. Tải lại trang, tạo một chuyến đi và kiểm tra phiên đăng nhập vẫn hoạt động.
3. Đăng xuất rồi đăng nhập lại, kiểm tra mã người dùng không thay đổi.
4. Đăng nhập bằng email/mật khẩu với tài khoản cũ để kiểm tra luồng hiện tại.

Việc hiển thị One Tap còn phụ thuộc tài khoản Google đang đăng nhập, chấp thuận của người dùng và cài đặt trình duyệt. Nếu lời mời không xuất hiện, sử dụng nút Google chính thức. Nếu để trang mở quá lâu khiến mã xác thực hết hạn, tải lại trang để thử lại.

---

## 📚 6. Tài liệu tham khảo

* [Google Identity Services — JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)
* [Xác minh Google ID token tại máy chủ](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

---

*Bản sao các file gốc trước khi chỉnh sửa được lưu trong thư mục `.one-tap-backup` tại thư mục gốc của dự án.*
