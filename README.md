# 🎯 ORI TOEIC Score System

Hệ thống báo điểm TOEIC tự động — Deploy miễn phí trên Vercel, dữ liệu lưu Google Sheets.

## ✨ Tính năng

- ✅ Nhập điểm theo từng Part (P1–P7) hoặc dán text tự nhận diện
- ✅ **Quy đổi điểm TOEIC chính thức** (bảng Listening + Reading chuẩn ETS)
- ✅ So sánh với tháng trước, hiển thị tăng/giảm
- ✅ Đề xuất mục tiêu tháng sau theo chuẩn ORI TOEIC
- ✅ Mã học viên (ORI-XXXXX) + SĐT tránh trùng
- ✅ AI phân tích điểm mạnh/yếu, kế hoạch 4 tuần (tuỳ chọn)
- ✅ Dữ liệu lưu trên Google Sheets — ai cũng mở xem được
- ✅ Truy cập từ điện thoại, máy tính, tablet

## 💰 Chi phí

| Hạng mục | Chi phí |
|---|---|
| Vercel hosting | **0đ** |
| Google Sheets API | **0đ** |
| Domain (tuỳ chọn) | ~250k/năm |
| Claude AI (tuỳ chọn) | ~50k/tháng |
| **TỔNG BẮT BUỘC** | **0đ** |

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT (từ A đến Z)

### Bước 1: Tạo Google Sheet

1. Mở [Google Sheets](https://sheets.google.com) → tạo bảng tính mới
2. Đặt tên: **"ORI TOEIC Data"**
3. Copy **Sheet ID** từ URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID_Ở_ĐÂY]/edit
   ```
   → Lưu lại Sheet ID này

### Bước 2: Tạo Google Cloud Project (miễn phí)

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project mới → đặt tên "TOEIC System"
3. Bật **Google Sheets API**:
   - Vào **APIs & Services** → **Library**
   - Tìm "Google Sheets API" → nhấn **Enable**

### Bước 3: Tạo Service Account

1. Vào **APIs & Services** → **Credentials**
2. Nhấn **Create Credentials** → **Service Account**
3. Đặt tên: "toeic-sheets" → nhấn **Done**
4. Nhấn vào service account vừa tạo → tab **Keys**
5. **Add Key** → **Create new key** → chọn **JSON** → tải file về
6. Mở file JSON, copy 2 giá trị:
   - `client_email` → đây là **GOOGLE_SERVICE_ACCOUNT_EMAIL**
   - `private_key` → đây là **GOOGLE_PRIVATE_KEY**

### Bước 4: Chia sẻ Sheet cho Service Account

1. Mở Google Sheet ở Bước 1
2. Nhấn **Share** (Chia sẻ)
3. Dán email service account (dạng `xxx@xxx.iam.gserviceaccount.com`)
4. Chọn quyền **Editor** → nhấn **Send**

### Bước 5: Deploy lên Vercel

#### Cách A: Deploy bằng Vercel CLI (nhanh nhất)

```bash
# 1. Cài Vercel CLI
npm i -g vercel

# 2. Vào thư mục project
cd toeic-app

# 3. Cài dependencies
npm install

# 4. Deploy
vercel

# 5. Thêm environment variables
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add GOOGLE_SHEET_ID

# 6. Deploy lại
vercel --prod
```

#### Cách B: Deploy qua GitHub (tự động)

1. Push code lên GitHub repo
2. Vào [vercel.com](https://vercel.com) → đăng nhập bằng GitHub
3. Nhấn **New Project** → chọn repo
4. Thêm **Environment Variables**:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = email service account
   - `GOOGLE_PRIVATE_KEY` = private key (bao gồm cả -----BEGIN... và -----END...)
   - `GOOGLE_SHEET_ID` = ID từ URL sheet
   - `ANTHROPIC_API_KEY` = (tuỳ chọn, để bật AI)
5. Nhấn **Deploy**

### Bước 6: Test

1. Mở URL Vercel cho bạn (dạng `toeic-xxx.vercel.app`)
2. Nhập thử: Tên "Test" → điểm bất kỳ → nhấn "Tạo báo cáo"
3. Mở Google Sheet → kiểm tra dữ liệu đã ghi chưa ✅

---

## 📁 Cấu trúc Project

```
toeic-app/
├── src/
│   ├── app/
│   │   ├── layout.js          # Root layout
│   │   ├── globals.css         # Global styles
│   │   ├── page.js             # Main UI (client component)
│   │   └── api/
│   │       ├── students/route.js  # API: CRUD học viên
│   │       ├── scores/route.js    # API: CRUD điểm
│   │       └── analyze/route.js   # API: AI phân tích
│   └── lib/
│       ├── sheets.js           # Google Sheets database layer
│       └── toeic.js            # Bảng quy đổi & tính điểm
├── .env.local.example          # Template environment variables
├── package.json
├── next.config.js
└── README.md
```

## 📊 Cấu trúc Google Sheet

Hệ thống tự tạo 2 sheet:

**Sheet "students":**
| Mã HV | Tên | SĐT | Ngày tạo |
|---|---|---|---|
| ORI-A3B7K | Gia Huy | 0906303373 | 2024-12-01 |

**Sheet "scores":**
| Mã HV | Tháng | P1 | P2 | P3 | P4 | P5 | P6 | P7 | L Đúng | R Đúng | L Điểm | R Điểm | Tổng | Ngày nhập |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ORI-A3B7K | 2024-12 | 3 | 12 | 16 | 12 | 17 | 10 | 34 | 43 | 61 | 225 | 300 | 525 | 2024-12-15T10:30 |

## ❓ FAQ

**Q: Tôi không biết code, có cài được không?**
A: Được. Chỉ cần làm theo 6 bước ở trên. Phần khó nhất là Bước 2-3 (Google Cloud) — mất khoảng 15 phút.

**Q: Nhiều giáo viên dùng chung được không?**
A: Được. Ai có link web đều dùng được. Dữ liệu chung trên 1 Google Sheet.

**Q: Muốn mua domain riêng?**
A: Mua domain ở Namecheap/GoDaddy (~$10/năm) → thêm vào Vercel project settings.

**Q: AI phân tích có bắt buộc không?**
A: Không. Bỏ trống `ANTHROPIC_API_KEY` thì chỉ tính điểm + báo cáo, không có phần AI.

**Q: Data có an toàn không?**
A: Dữ liệu nằm trên Google Drive của bạn, có version history. Backup tự động bởi Google.

---

**Zalo hỗ trợ: 0906 303 373**
