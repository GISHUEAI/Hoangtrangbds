# BĐS Portal – Trang giới thiệu dự án bất động sản

Trang tổng liệt kê các dự án, có tìm kiếm và lọc. Mỗi dự án có **một landing page riêng** tại `/du-an/<slug>/`.
Không dùng framework, không cần cài thư viện: chỉ cần Node.js (Vercel có sẵn).

## Cấu trúc
```
content/
  site.json              ← Thông tin chung: tên thương hiệu, hotline, Zalo, tên miền, URL form
  projects/*.json        ← MỖI TỆP = 1 DỰ ÁN = 1 LANDING PAGE  (_mau.json là tệp mẫu)
  custom/<slug>/         ← (tuỳ chọn) landing page tự thiết kế riêng bằng HTML
static/
  images/<slug>/         ← Ảnh của từng dự án
  assets/                ← CSS, JS dùng chung
apps-script/Code.gs      ← Nhận form đăng ký → Google Sheet + email báo
build.js                 ← Sinh trang tĩnh vào dist/
vercel.json              ← Cấu hình Vercel
```

## Đưa lên mạng (làm một lần)
1. Tạo repo GitHub mới, ví dụ `bds-portal`, rồi tải toàn bộ thư mục này lên.
2. Vào vercel.com → đăng nhập bằng GitHub → **Add New → Project** → chọn repo → **Deploy**.
   Vercel tự đọc `vercel.json`, không cần chỉnh gì.
3. Sửa `domain` trong `content/site.json` thành địa chỉ Vercel cấp (hoặc tên miền riêng), để ảnh xem trước khi chia sẻ link lên Zalo/Facebook hiển thị đúng.

## Thêm một dự án mới (khoảng 10 phút)
1. Sao chép `content/projects/_mau.json` → `content/projects/ten-du-an.json`, điền thông tin.
2. Tải ảnh vào `static/images/ten-du-an/` (ảnh bìa nên là JPG ngang 1600×900, dưới 400 KB).
3. Commit và push lên GitHub. Khoảng 30 giây sau, trang `/du-an/ten-du-an/` sẽ hoạt động và tự xuất hiện ở trang tổng.

Một số trường cần biết:
- `status`: `Đang mở bán` | `Sắp mở bán` | `Đã bán hết` (quyết định màu nhãn)
- `published: false` → tạm ẩn dự án
- `order` → thứ tự hiển thị
- `videoUrl` → link YouTube, tự nhúng vào trang
- `lat`, `lng` → toạ độ cho bản đồ (lấy từ Google Maps: chuột phải vào điểm → bấm vào số toạ độ để sao chép)

## Landing page thiết kế riêng
Nếu một dự án cần trang "đo ni đóng giày", ví dụ trang có video điện ảnh hoặc hiệu ứng riêng:
đặt `"customPage": true` trong JSON, rồi đưa trang HTML vào `content/custom/<slug>/index.html`.
Trang tổng vẫn hiển thị thẻ của dự án này từ dữ liệu JSON.

## Nhận khách hàng (lead) về Google Sheet
Làm theo hướng dẫn ở đầu tệp `apps-script/Code.gs`, sau đó dán URL `/exec` vào `formEndpoint` trong `site.json`.
Nếu chưa cấu hình, nút "Gửi" sẽ sao chép nội dung và mở Zalo.

## Chạy thử trên máy
```
node build.js
cd dist && python3 -m http.server 8000   # mở http://localhost:8000
```

> Lưu ý: gói Vercel Hobby (miễn phí) chỉ dành cho mục đích phi thương mại. Trang bán bất động sản là hoạt động thương mại, nên khi chạy thật cần dùng gói Pro, hoặc chuyển sang Cloudflare Pages hay Netlify (gói miễn phí cho phép dùng thương mại; cấu hình tương tự: lệnh build `node build.js`, thư mục `dist`).
