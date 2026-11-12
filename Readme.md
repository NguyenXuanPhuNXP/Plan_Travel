# PlanTravel

Ứng dụng lập kế hoạch du lịch Việt Nam với lịch trình theo ngày, bản đồ, bạn đồng hành, danh sách đồ mang theo và quản lý từng khoản chi. Frontend dùng React/Vite; API dùng Express, Prisma và MySQL. Dịch vụ Python cung cấp các API AI, tìm kiếm và thời tiết.

Luồng lập kế hoạch thủ công hoạt động với frontend, API Node.js và MySQL. Màn lập kế hoạch AI gọi API để lấy địa điểm thực và tạo lịch trình. Nếu Python AI không phản hồi, backend sắp xếp các địa điểm thực theo quy tắc; nếu chưa lấy được địa điểm đúng vùng, giao diện báo lỗi.

Xem [tổng hợp các thay đổi mới](THAY_DOI_MOI.md) để biết các tính năng landing, planner, khám phá và chia sẻ kế hoạch trong đợt cập nhật này.

## Nội dung

- [Cài đặt lần đầu](#cài-đặt-lần-đầu)
- [Cập nhật máy đã cài](#cập-nhật-mã-nguồn-trên-máy-đã-cài)
- [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
- [Bản tin và chia sẻ kế hoạch](#bản-tin-chuyến-đi-và-khám-phá)
- [Cấu hình bản đồ](#bản-đồ-geoapify)
- [Python AI và thời tiết](#dịch-vụ-python-aithời-tiết--tùy-chọn)
- [Build và kiểm thử](#build-và-kiểm-thử)
- [Triển khai và sao lưu](#triển-khai-và-sao-lưu)
- [Lỗi thường gặp](#lỗi-thường-gặp)

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
VITE_GEOAPIFY_API_KEY=
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

Sau đó khởi động lại bằng `npm run backend:dev` và `npm run dev`. Với database đã có dữ liệu, dùng `db:migrate` để áp dụng migration mới; không cần seed lại. Migration `20261111160000_add_trip_expenses` lưu từng khoản chi, người trả và người cùng chia; `20261112180000_trip_community` thêm bảng bài viết chuyến đi, bình luận và đánh giá; `20261112193000_community_photos` lưu danh sách ảnh của bài viết.

## Hướng dẫn sử dụng

### 1. Trang chủ và tài khoản

1. Mở `http://localhost:5173/` để xem landing với video nền, bản đồ Việt Nam và các gợi ý hành trình. Có thể tạm dừng video; hệ điều hành bật giảm chuyển động sẽ nhận giao diện ít hiệu ứng hơn.
2. Bấm **Đăng nhập** hoặc tạo tài khoản bằng email và mật khẩu. Đăng nhập Google cần cấu hình riêng ở phần bên dưới.
3. Sau khi đăng nhập, mở **Bảng điều khiển** ở `/dashboard` để vào các tác vụ. Nếu bắt đầu lập lịch từ trang chủ, đăng nhập xong sẽ trở lại trang đang chọn.
4. Mở **Hồ sơ cá nhân** để quản lý thông tin tài khoản. Thông báo truy cập từ biểu tượng chuông trên thanh trên cùng; sidebar không còn mục thông báo riêng. Box chat chỉ xuất hiện trong các trang ứng dụng khi đã đăng nhập, không xuất hiện ở landing.

### 2. Tạo kế hoạch thủ công

1. Chọn **Lập kế hoạch thủ công** trong sidebar, hoặc mở `/planner/map`.
2. Ở **Địa điểm muốn đi**, chọn một trong sáu gợi ý hiện sẵn hoặc gõ để lọc. Có thể gõ không dấu, ví dụ `phu quoc`, rồi chọn **Phú Quốc**; vẫn có thể tự nhập một điểm đến khác tại Việt Nam.
3. Chọn ngày xuất phát và ngày kết thúc. Chọn bạn đồng hành nếu đã kết bạn. Mở **Tên chuyến đi, phương tiện & sở thích** khi cần thêm thông tin.
4. Bấm **Bắt đầu lập lịch trình**. Đây là bản nháp: chọn điểm đến hoặc tạo tên kế hoạch chưa tự sinh các điểm dừng.
5. Trong chi tiết kế hoạch, chọn ngày, tìm địa điểm trên bản đồ rồi bấm **Thêm vào lịch trình**, hoặc dùng nút thêm điểm đến trong ngày để nhập thủ công. Chỉ tìm kiếm hay bấm ghim chưa thêm địa điểm vào kế hoạch.
6. Sửa giờ, thời lượng, ghi chú; kéo để sắp xếp điểm dừng. Lưu thay đổi bằng nút lưu trong trình chỉnh sửa và kiểm tra lại sau khi tải lại trang.

### 3. Lập lịch bằng AI

1. Mở **Lập kế hoạch (AI)** ở `/planner`.
2. Chọn điểm đến, ngày đi, số người, phương tiện và sở thích rồi bấm **Tạo lịch trình**.
3. Đọc thông báo về nguồn tạo lịch. Khi dịch vụ AI không phản hồi, lịch có thể được sắp xếp theo quy tắc từ địa điểm thật đã lưu; thiếu dữ liệu đúng vùng sẽ báo lỗi.
4. Kiểm tra từng ngày, thay đổi giờ/điểm dừng hoặc chỉnh danh sách địa điểm để tạo lại lịch trình. Mở **Gợi ý di chuyển, lưu trú & chuẩn bị** để đọc phần tư vấn.
5. Bấm **Lưu kế hoạch** để lưu vào tài khoản. Kiểm tra giá, giờ mở cửa, đặt chỗ và thời tiết trước khi đi; gợi ý không phải xác nhận đặt dịch vụ.

### 4. Quản lý kế hoạch đã lưu

- **Lịch sử chuyến đi** (`/history`): mở các chuyến đã lưu, xem trạng thái và tiếp tục chỉnh sửa.
- **Chi tiết kế hoạch** (`/trip/:id`): chuyển giữa lịch trình, ngân sách và vật dụng; xem bản đồ theo ngày.
- **Ngân sách**: nhập các khoản chi thực tế, người trả và người cùng chia; tổng chi và số tiền cần thanh toán được tính từ các khoản đó.
- **Vật dụng**: thêm từ danh mục hoặc nhập riêng, chỉnh số lượng, đánh dấu đã chuẩn bị.
- **Quản lý chuyến đi**: sửa thông tin, quản lý nhóm, cập nhật trạng thái và chia sẻ kế hoạch lên bản tin. Chủ kế hoạch có quyền quản lý; cộng tác viên thao tác theo quyền được cấp.
- **Nhóm chat**: trao đổi với bạn đồng hành trong nhóm chuyến đi; dùng box chat ở các trang ứng dụng để xem cuộc trò chuyện.

### 5. Khám phá và chia sẻ trải nghiệm

1. Vào **Khám phá điểm đến** (`/explore`), tìm hoặc lọc điểm đến rồi mở chi tiết.
2. Xem **Những nơi không nên bỏ lỡ**; mở liên kết bản đồ cho từng địa danh. Nút lên kế hoạch chuyển điểm đến sang planner; danh sách gợi ý không tự thêm các điểm dừng.
3. Sau chuyến đi, vào **Quản lý chuyến đi → Chia sẻ kế hoạch lên bản tin**, hoặc mở `/community` và bấm **Chia sẻ kế hoạch**.
4. Chọn kế hoạch của chính mình, điền ngày đã trải nghiệm, xem toàn bộ bản kế hoạch sẽ công khai. Cảm nhận là tùy chọn.
5. Chọn ảnh từ máy, xem trước và bỏ ảnh không muốn đăng. Bấm **Chia sẻ kế hoạch** để đăng.
6. Người khác xem lịch trình ngay trong bài đăng; mở **Xem kế hoạch & ảnh** để xem ảnh, bình luận và đánh giá. Khách chưa đăng nhập vẫn đọc được; bình luận và chấm sao cần tài khoản.

Nếu bài chỉ có tên hoặc các ngày trống, kiểm tra kế hoạch gốc đã có điểm dừng **được lưu** chưa. Bài chia sẻ là bản chụp tại lúc đăng: thêm điểm dừng vào bản riêng sau đó không tự cập nhật bài cũ. Muốn công khai lịch trình mới, đăng lại từ kế hoạch đã lưu; không tự lấy thêm dữ liệu riêng vào bài cũ.

## Bản tin chuyến đi và khám phá

- `/community` cho phép mọi người xem kế hoạch đã được chia sẻ. Người đăng nhập chọn một kế hoạch đã tạo của mình, thêm ngày trải nghiệm, cảm nhận tùy chọn và ảnh từ file. Trong chi tiết chuyến đi, vào “Quản lý chuyến đi” → “Chia sẻ kế hoạch lên bản tin” để mở sẵn kế hoạch đó. Tác giả có thể sửa hoặc xóa bài.
- Bài viết công khai bản chụp kế hoạch: tên, điểm đến, ngày đi, số người, phương tiện, ngân sách dự kiến và các điểm dừng theo ngày với giờ bắt đầu/kết thúc, địa chỉ và liên kết bản đồ. Không công khai ghi chú riêng, chi tiêu thực tế, thành viên hay trò chuyện; chuyến đi gốc vẫn giữ quyền riêng tư hiện tại. Các chỉnh sửa riêng sau khi đăng không tự thay đổi bản đã chia sẻ.
- Có thể chọn tối đa 8 ảnh JPG/PNG/WebP từ máy, xem trước và bỏ ảnh trước khi lưu; ảnh đầu tiên là ảnh bìa. Trình duyệt tối ưu ảnh về JPEG tối đa 2000px. API kiểm tra nội dung JPEG/PNG, tối đa 2 MB/ảnh, 8 MB ảnh mới cho mỗi lần lưu. Ảnh bị bỏ và ảnh thuộc bài bị xóa được dọn khỏi máy chủ.
- Ảnh được lưu trong `backend/uploads/community/` và phục vụ qua `/uploads/community/`. Khi triển khai cần ổ đĩa lưu trữ bền vững và sao lưu thư mục `backend/uploads` cùng database; thư mục này không được đưa vào Git.
- Người đọc đăng nhập có thể bình luận và chấm 1–5 sao, thay đổi hoặc gỡ đánh giá của mình. Mỗi tài khoản có một đánh giá cho mỗi bài và không tự đánh giá bài của mình. Người viết bình luận và chủ bài viết có quyền xóa bình luận.
- Trong chi tiết điểm đến ở `/explore`, mục “Những nơi không nên bỏ lỡ” có các địa danh nổi bật và liên kết xem bản đồ. Danh sách 44 địa danh của 11 điểm đến cùng nguồn tham khảo nằm trong `frontend/src/utils/destinationHighlights.js`; đây là gợi ý khám phá, không tự thêm vào lịch trình.

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

Để chỉ kiểm tra nhóm tính năng chia sẻ, ảnh và gợi ý điểm đến:

```powershell
node --test backend/tests/community.test.js backend/tests/communityPhotos.test.js backend/tests/tripPhotos.test.js backend/tests/tripDestinationSuggestions.test.js backend/tests/landingFrontend.test.js
```

## Triển khai và sao lưu

1. Cài dependencies bằng `npm run install:all`, cấu hình database của máy chủ trong `backend/.env`, rồi chạy `npm run db:generate` và `npm run db:migrate`. Với database từ xa, tạo database bằng công cụ quản trị trước; `db:init` chỉ tự tạo database trên localhost và dành cho khởi tạo demo.
2. Đặt `FRONTEND_URL` và `FRONTEND_ORIGIN` thành origin frontend thật; đặt `VITE_API_URL` thành URL API có đuôi `/api`. Giá trị `VITE_*` được đưa vào bản build, nên phải build lại khi đổi URL hoặc khóa bản đồ.
3. Chạy `npm run build`, phục vụ `frontend/dist` bằng web server có cấu hình SPA fallback về `index.html`. Chạy API bằng `npm start` và quản lý tiến trình bằng công cụ của máy chủ. Lệnh `npm start` không tự phục vụ frontend.
4. Phục vụ API và `/uploads` qua HTTPS. Nếu dùng tên miền frontend/API khác nhau, cấu hình CORS đúng origin và bảo đảm URL ảnh tại máy chủ API truy cập được.
5. Gắn ổ đĩa bền vững cho `backend/uploads`; sao lưu thư mục này cùng MySQL. Chỉ sao lưu database sẽ không giữ được các file ảnh. Không xóa Docker volume database khi cập nhật.
6. Nếu cần Python, chạy dịch vụ ở máy chủ phù hợp và đặt `PYTHON_AI_URL` cho API Node. Phần thời tiết frontend hiện gọi cố định `http://localhost:8001/api`; khi đưa lên mạng phải cập nhật cấu hình/đường dẫn trong `frontend/src/services/WeatherService.js` rồi build lại.
7. Dùng bí mật riêng, thay thông tin đăng nhập demo và không công khai `.env`. Máy chủ cần giữ quyền ghi ảnh trong thư mục uploads. Việc push/merge Git không tự triển khai website.

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
| Chia sẻ báo thiếu cột `photos` hoặc bảng `trip_posts` | Dừng API, chạy `npm run db:generate`, `npm run db:migrate`, rồi khởi động lại. |
| Bài chia sẻ chỉ có tên/ngày trống | Kiểm tra bản gốc có điểm dừng đã lưu; bài cũ không tự cập nhật khi kế hoạch riêng thay đổi. |
| Ảnh mất sau khi đổi máy hoặc deploy lại | Khôi phục `backend/uploads` từ bản sao lưu; kiểm tra ổ lưu trữ và URL API. |
| Không thêm được ảnh | Chọn JPG/PNG/WebP, ảnh gốc dưới 15 MB, tối đa 8 ảnh; kiểm tra quyền ghi thư mục uploads và giới hạn dung lượng request của proxy. |

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
