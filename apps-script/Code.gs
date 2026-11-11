/**
 * Nhận đăng ký khách hàng từ landing page → ghi vào Google Sheet (+ email báo).
 * CÁCH DÙNG:
 *  1. Tạo Google Sheet mới → Tiện ích mở rộng → Apps Script → dán đoạn code này.
 *  2. Sửa NOTIFY_EMAIL (để trống nếu không cần email báo).
 *  3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web
 *     - Thực thi dưới dạng: Tôi | Người có quyền truy cập: Bất kỳ ai
 *  4. Sao chép URL /exec → dán vào "formEndpoint" trong content/site.json → push GitHub.
 */
const NOTIFY_EMAIL = ""; // ← ví dụ "ban@gmail.com"
const SHEET_NAME = "Leads";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(["Thời gian", "Dự án", "Họ tên", "Số điện thoại", "Nhu cầu", "Ghi chú", "Trang", "Trạng thái xử lý", "Người phụ trách"]);
      sh.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#0a1628").setFontColor("#ffffff");
      sh.setFrozenRows(1);
    }
    const clean = v => String(v || "").replace(/^[=+\-@]/, "'").slice(0, 500); // chặn chèn công thức
    sh.appendRow([new Date(), clean(d.project), clean(d.name), "'" + clean(d.phone), clean(d.need), clean(d.note), clean(d.page), "Mới", ""]);
    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, `[Lead mới] ${d.project} – ${d.name}`,
        `Dự án: ${d.project}\nHọ tên: ${d.name}\nSĐT: ${d.phone}\nNhu cầu: ${d.need}\nGhi chú: ${d.note || ""}\nTrang: ${d.page}`);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
