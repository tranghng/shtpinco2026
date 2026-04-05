# 🚀 Hướng dẫn Setup — KCNC 2026 Dashboard

## Tổng quan kiến trúc

```
GitHub Pages (website)  →  Google Apps Script (API)  →  Google Sheets (dữ liệu)
     index.html                   Code.gs                Tasks / Meetings / Docs
     app.js, api.js
     config.js ← BẠN CHỈ SỬA FILE NÀY
```

---

## BƯỚC 1 — Tạo Google Spreadsheet

1. Vào https://sheets.new → tạo sheet mới
2. Đặt tên: **"KCNC 2026 — Conference Dashboard"**
3. Copy **Spreadsheet ID** từ URL:
   ```
   https://docs.google.com/spreadsheets/d/  <<< ID Ở ĐÂY >>>  /edit
   ```
   Ví dụ: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

---

## BƯỚC 2 — Tạo Google Apps Script

1. Trong Spreadsheet vừa tạo: **Extensions → Apps Script**
2. Xóa hết code mặc định trong `Code.gs`
3. Copy toàn bộ nội dung file **`Code.gs`** (trong thư mục này) vào
4. Thay `THAY_BANG_ID_SPREADSHEET_CUA_BAN` bằng ID bạn copy ở Bước 1:
   ```javascript
   const SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
   ```
5. **Lưu** (Ctrl+S), đặt tên project: `KCNC2026-API`

### Khởi tạo các Sheets

6. Trong Apps Script, nhấn **Run** → chọn function **`initAllSheets`**
7. Lần đầu chạy: Google yêu cầu cấp quyền → **Review permissions → Allow**
8. Kiểm tra Spreadsheet — sẽ thấy 3 sheet mới: **Tasks**, **Meetings**, **Docs**

### Deploy Web App

9. Nhấn **Deploy → New deployment**
10. Cấu hình:
    - **Type**: Web App
    - **Execute as**: **Me** (tài khoản Google của bạn)
    - **Who has access**: **Only myself** *(chỉ bạn truy cập được)*
11. Nhấn **Deploy** → Copy **Web App URL**

    URL có dạng:
    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```

> ⚠️ Mỗi lần sửa `Code.gs`, phải **Deploy → New deployment** (hoặc **Manage deployments → Edit**) để cập nhật.

---

## BƯỚC 3 — Cấu hình Website

Mở file **`config.js`** và điền 2 giá trị:

```javascript
const CONFIG = {
  // URL Apps Script từ Bước 2
  GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec',

  // Folder ID của thư mục Drive gốc chứa tài liệu hội nghị
  // Lấy từ URL: drive.google.com/drive/folders/<<< ID >>>
  DRIVE_FOLDER_ID: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',

  EVENT_DATE: '2026-10-15',
};
```

### Lấy DRIVE_FOLDER_ID ở đâu?

1. Vào [drive.google.com](https://drive.google.com)
2. Tạo thư mục **"KCNC 2026 — Hội Nghị"** (hoặc dùng thư mục có sẵn)
3. Mở thư mục đó → nhìn URL:
   ```
   https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          Copy phần này
   ```
4. Dán vào `DRIVE_FOLDER_ID` trong `config.js`

---

## BƯỚC 4 — Đưa lên GitHub Pages

### 4a. Tạo Repository

1. Vào https://github.com → **New repository**
2. Tên repo: `kcnc2026` (hoặc tùy bạn)
3. Chọn **Public** *(GitHub Pages miễn phí cần Public)*
4. Nhấn **Create repository**

### 4b. Upload files

**Cách A — Qua giao diện web (dễ nhất):**

1. Trong repo vừa tạo → nhấn **Add file → Upload files**
2. Kéo thả tất cả các file sau vào:
   ```
   index.html
   style.css
   config.js
   api.js
   app.js
   ```
3. Commit message: `Initial deploy — KCNC 2026 Dashboard`
4. Nhấn **Commit changes**

**Cách B — Dùng Git (nếu đã cài):**

```bash
cd kcnc2026/
git init
git add index.html style.css config.js api.js app.js
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/TÊN_BẠN/kcnc2026.git
git push -u origin main
```

### 4c. Bật GitHub Pages

1. Trong repo → **Settings → Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / `/ (root)`
4. Nhấn **Save**
5. Chờ ~2 phút → URL website sẽ là:
   ```
   https://TÊN_BẠN.github.io/kcnc2026/
   ```

---

## BƯỚC 5 — Xử lý CORS (nếu bị lỗi)

Nếu trình duyệt báo lỗi CORS khi gọi Apps Script, vào lại Apps Script:

**Deploy → Manage deployments → Edit** → đổi **Who has access** thành **Anyone** (vẫn an toàn vì URL rất dài, khó đoán).

Hoặc thêm vào `Code.gs` trước return:

```javascript
function doGet(e) {
  const output = handleRequest(e);
  output.setHeader('Access-Control-Allow-Origin', '*');
  return output;
}
```

---

## BƯỚC 6 — Kiểm tra hoạt động

1. Mở website GitHub Pages của bạn
2. Góc trên phải: **chấm xanh** = kết nối thành công ✓
3. Thêm 1 nhiệm vụ → vào Google Sheets kiểm tra → dữ liệu đã xuất hiện

---

## Cập nhật website sau này

Khi muốn sửa code:
1. Sửa file trên máy
2. Upload lại qua GitHub (Add file → Upload) hoặc dùng `git push`
3. GitHub Pages tự cập nhật sau ~1 phút

---

## Cấu trúc Google Sheets sau khi setup

### Sheet "Tasks"
| id | name | phase | owner | due | priority | status | note | createdAt | updatedAt |

### Sheet "Meetings"
| id | name | date | time | mode | loc | attendees | agenda | link | createdAt |

### Sheet "Docs"
| id | name | type | cat | url | desc | createdAt |

Bạn có thể **xem, sửa trực tiếp trong Sheets** bất cứ lúc nào — website sẽ load dữ liệu mới nhất mỗi khi mở tab.

---

## Lưu ý bảo mật

- **Chỉ mình bạn** truy cập được API (vì deploy "Only myself")
- URL Apps Script rất dài và ngẫu nhiên, khó đoán
- Google Sheets nằm trong Google Drive cá nhân của bạn
- Không có mật khẩu cần quản lý

---

*Cần hỗ trợ thêm: quay lại Claude và mô tả lỗi gặp phải!*
