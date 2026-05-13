const SHEET_NAME = "Orders";
const HEADERS = [
  "BatchID",
  "Status",
  "StatusUpdatedAt",
  "SubmittedAt",
  "CompanyName",
  "Branch",
  "SupervisorName",
  "SupervisorPhone",
  "EmployeeName",
  "Gender",
  "Type",
  "Size",
  "Qty"
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
    validateBatch_(payload);

    const sheet = getOrdersSheet_();
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

    order.items.push({ type, size, qty: Number(qty || 0) });
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
