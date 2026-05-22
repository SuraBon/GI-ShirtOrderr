const SHEET_NAME = "Orders";
const HEADERS = [
  "รหัสคำสั่งซื้อ",
  "สถานะ",
  "อัปเดตสถานะ",
  "วันที่ส่ง",
  "ชื่อบริษัท",
  "สาขา",
  "ผู้ติดต่อ",
  "เบอร์ติดต่อ",
  "ชื่อพนักงาน",
  "เพศ",
  "ประเภท",
  "สี",
  "ไซส์",
  "จำนวน"
];

function doGet() {
  try {
    const sheet = getOrdersSheet_();
    return json_({ success: true, data: readBatches_(sheet) });
  } catch (error) {
    return json_({ success: false, error: String(error.message || error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload_(e);
    const sheet = getOrdersSheet_();

    if (payload.action === "updateStatus") {
      const updatedRows = updateBatchStatus_(sheet, payload);
      return json_({ success: true, action: payload.action, batchId: payload.batchId, rows: updatedRows });
    }

    if (payload.action === "deleteBatch") {
      const deletedRows = deleteBatch_(sheet, payload.batchId);
      return json_({ success: true, action: payload.action, batchId: payload.batchId, rows: deletedRows });
    }

    validateBatch_(payload);

    const rows = buildRows_(payload);
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }

    return json_({ success: true, batchId: payload.batchId, rows: rows.length });
  } catch (error) {
    return json_({ success: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents;
  if (!raw) throw new Error("Missing request body");
  return JSON.parse(raw);
}

function validateBatch_(batch) {
  if (!batch || typeof batch !== "object") throw new Error("Invalid batch payload");
  if (!batch.batchId) throw new Error("Missing batchId");
  if (!Array.isArray(batch.orders) || !batch.orders.length) throw new Error("Missing orders");
}

function updateBatchStatus_(sheet, payload) {
  if (!payload.batchId) throw new Error("Missing batchId");
  if (!payload.status) throw new Error("Missing status");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const statusUpdatedAt = payload.statusUpdatedAt || new Date().toISOString();
  let updatedRows = 0;

  values.forEach((row, index) => {
    if (String(row[0]) !== String(payload.batchId)) return;
    const rowNumber = index + 2;
    sheet.getRange(rowNumber, 2).setValue(payload.status);
    sheet.getRange(rowNumber, 3).setValue(statusUpdatedAt);
    updatedRows += 1;
  });

  if (!updatedRows) throw new Error("Batch not found");
  return updatedRows;
}

function deleteBatch_(sheet, batchId) {
  if (!batchId) throw new Error("Missing batchId");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let deletedRows = 0;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (String(values[index][0]) !== String(batchId)) continue;
    sheet.deleteRow(index + 2);
    deletedRows += 1;
  }

  if (!deletedRows) throw new Error("Batch not found");
  return deletedRows;
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = currentHeaders.join("") === "" || HEADERS.some((header, index) => currentHeaders[index] !== header);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function buildRows_(batch) {
  const status = batch.status || "รอจัดส่ง";
  const statusUpdatedAt = batch.statusUpdatedAt || batch.submittedAt || new Date().toISOString();
  const submittedAt = batch.submittedAt || new Date().toISOString();

  return batch.orders.flatMap((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    return items
      .filter((item) => item && item.type && item.size && Number(item.qty || 0) > 0)
      .map((item) => [
        batch.batchId,
        status,
        statusUpdatedAt,
        submittedAt,
        batch.companyName || "",
        batch.branch || "",
        batch.supervisorName || "",
        batch.supervisorPhone || "",
        order.name || "",
        order.gender || "",
        item.type || "",
        item.color || "",
        item.size || "",
        Number(item.qty || 0)
      ]);
  });
}

function readBatches_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const batches = new Map();

  values.forEach((row) => {
    const [
      batchId,
      status,
      statusUpdatedAt,
      submittedAt,
      companyName,
      branch,
      supervisorName,
      supervisorPhone,
      employeeName,
      gender,
      type,
      color,
      size,
      qty
    ] = row;

    if (!batchId || !employeeName || !type || !size || Number(qty || 0) <= 0) return;

    if (!batches.has(batchId)) {
      batches.set(batchId, {
        batchId,
        companyName,
        branch,
        supervisorName,
        supervisorPhone,
        submittedAt: toIso_(submittedAt),
        status,
        statusUpdatedAt: toIso_(statusUpdatedAt || submittedAt),
        orders: []
      });
    }

    const batch = batches.get(batchId);
    let order = batch.orders.find((item) => item.name === employeeName && item.gender === gender);
    if (!order) {
      order = { name: employeeName, gender, items: [] };
      batch.orders.push(order);
    }

    order.items.push({ type, color: color || "", size, qty: Number(qty || 0) });
  });

  return Array.from(batches.values()).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

function toIso_(value) {
  if (value instanceof Date) return value.toISOString();
  return value || "";
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
