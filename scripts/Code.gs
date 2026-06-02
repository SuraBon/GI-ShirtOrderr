const SHEET_NAME = "Orders";
const ORDER_STATUSES = ["รอจัดส่ง", "จัดส่งแล้ว", "ยกเลิก"];
const HEADERS = [
  "รหัสคำสั่งเบิก",
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
  "ไซส์",
  "จำนวน"
];

const STOCK_HEADERS = [
  "ประเภทเสื้อ",
  "เพศ",
  "ไซส์",
  "ยอดตั้งต้น",
  "เพิ่มเข้า",
  "ปรับลด",
  "เบิกแล้ว",
  "สต๊อกทั้งหมด",
  "คงเหลือ"
];

function doGet(e) {
  try {
    requireAdmin_(getRequestToken_(e, "adminToken"));
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
      requireAdmin_(payload.adminToken);
      const updatedRows = updateBatchStatus_(sheet, payload);
      return json_({ success: true, action: payload.action, batchId: payload.batchId, rows: updatedRows });
    }

    if (payload.action === "deleteBatch") {
      requireAdmin_(payload.adminToken);
      const deletedRows = deleteBatch_(sheet, payload.batchId);
      return json_({ success: true, action: payload.action, batchId: payload.batchId, rows: deletedRows });
    }

    if (payload.action === "shipItems") {
      requireAdmin_(payload.adminToken);
      const updatedRows = shipBatchItems_(sheet, payload);
      return json_({ success: true, action: payload.action, batchId: payload.batchId, rows: updatedRows });
    }

    if (payload.action === "syncStock") {
      requireAdmin_(payload.adminToken);
      syncStockSheet_(SpreadsheetApp.getActiveSpreadsheet(), payload.config);
      return json_({ success: true, action: payload.action });
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
  if (ORDER_STATUSES.indexOf(String(payload.status)) === -1) throw new Error("Invalid status");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const rowCount = lastRow - 1;
  const values = sheet.getRange(2, 1, rowCount, 3).getValues();
  const statusUpdatedAt = payload.statusUpdatedAt || new Date().toISOString();
  let updatedRows = 0;

  const statusValues = values.map((row) => {
    if (String(row[0]) !== String(payload.batchId)) return;
    updatedRows += 1;
    return [payload.status, statusUpdatedAt];
  });

  if (!updatedRows) throw new Error("Batch not found");
  sheet.getRange(2, 2, rowCount, 2).setValues(
    statusValues.map((row, index) => row || [values[index][1], values[index][2]])
  );
  return updatedRows;
}

// Security & Tokens helpers
function getRequestToken_(e, key) {
  return e && e.parameter && e.parameter[key] ? String(e.parameter[key]) : "";
}

function requireAdmin_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
  if (!expected) throw new Error("Missing ADMIN_TOKEN");
  if (String(token || "") !== String(expected)) throw new Error("Unauthorized");
}

function deleteBatch_(sheet, batchId) {
  if (!batchId) throw new Error("Missing batchId");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const deletedRows = deleteMatchingRows_(sheet, values, function(row) {
    return String(row[0]) === String(batchId);
  });

  if (!deletedRows) throw new Error("Batch not found");
  return deletedRows;
}

function deleteMatchingRows_(sheet, values, predicate) {
  const ranges = [];
  let runStart = null;
  let runLength = 0;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (!predicate(values[index], index)) {
      if (runStart !== null) ranges.push([runStart, runLength]);
      runStart = null;
      runLength = 0;
      continue;
    }

    runStart = index + 2;
    runLength += 1;
  }

  if (runStart !== null) ranges.push([runStart, runLength]);
  ranges.forEach(function(range) {
    sheet.deleteRows(range[0], range[1]);
  });
  return ranges.reduce(function(sum, range) {
    return sum + range[1];
  }, 0);
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = currentHeaders.join("") === "" || HEADERS.some((header, index) => currentHeaders[index] !== header);
  if (needsHeaders) {
    // If the spreadsheet already has data, clearing formatting or headers might be needed
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

    order.items.push({ 
      type, 
      size, 
      qty: Number(qty || 0),
      status: status || "รอจัดส่ง",
      statusUpdatedAt: toIso_(statusUpdatedAt || submittedAt)
    });
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

function shipBatchItems_(sheet, payload) {
  const batchId = payload.batchId;
  const items = payload.items; // array of { employeeName, gender, type, size, shippedQty, pendingQty, canceledQty }
  const statusUpdatedAt = payload.statusUpdatedAt || new Date().toISOString();
  if (!batchId) throw new Error("Missing batchId");
  if (!Array.isArray(items) || !items.length) throw new Error("Missing shipment items");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No orders found");

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  
  // Find metadata from the first matching row
  let meta = null;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(batchId)) {
      meta = values[i];
      break;
    }
  }

  if (!meta) throw new Error("Batch not found");

  const submittedAt = meta[3];
  const companyName = meta[4];
  const branch = meta[5];
  const supervisorName = meta[6];
  const supervisorPhone = meta[7];

  // Build new rows to replace existing rows for this batch
  const newBatchRows = [];
  items.forEach((item) => {
    const { employeeName, gender, type, size, shippedQty, pendingQty, canceledQty } = item;
    
    if (Number(shippedQty) > 0) {
      newBatchRows.push([
        batchId,
        "จัดส่งแล้ว",
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
        Number(shippedQty)
      ]);
    }
    
    if (Number(pendingQty) > 0) {
      newBatchRows.push([
        batchId,
        "รอจัดส่ง",
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
        Number(pendingQty)
      ]);
    }

    if (Number(canceledQty) > 0) {
      newBatchRows.push([
        batchId,
        "ยกเลิก",
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
        Number(canceledQty)
      ]);
    }
  });

  // Delete all rows matching batchId in contiguous chunks to avoid slow per-row deletes.
  deleteMatchingRows_(sheet, values, function(row) {
    return String(row[0]) === String(batchId);
  });

  // Write new rows
  if (newBatchRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newBatchRows.length, HEADERS.length).setValues(newBatchRows);
  }

  return newBatchRows.length;
}

function syncStockSheet_(spreadsheet, config) {
  let sheet = spreadsheet.getSheetByName("Stock");
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Stock");
  } else {
    // Unprotect the sheet if it was protected so we can clear/overwrite it
    try {
      const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      protections.forEach(function(protection) {
        protection.remove();
      });
    } catch (e) {
      console.warn("Could not remove sheet protection:", e);
    }
    sheet.clear();
  }

  // Row 1: Warning Banner
  sheet.getRange(1, 1, 1, STOCK_HEADERS.length).merge();
  const warningCell = sheet.getRange("A1");
  warningCell.setValue("⚠️ คำเตือน: ระบบอัปเดตข้อมูลแผ่นงานนี้โดยอัตโนมัติจากแดชบอร์ด ห้ามแก้ไขตัวเลขคงเหลือในตารางนี้โดยตรง (การแก้ไขจะสูญหาย)");
  warningCell.setFontWeight("bold");
  warningCell.setFontColor("#B91C1C");
  warningCell.setBackground("#FEF2F2");
  warningCell.setHorizontalAlignment("center");
  sheet.setRowHeight(1, 28);

  // Row 2: Headers
  const headerRange = sheet.getRange(2, 1, 1, STOCK_HEADERS.length);
  headerRange.setValues([STOCK_HEADERS]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#E8F0FE");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(2);

  if (config && config.length) {
    const stockRows = [];
    config.forEach((item) => {
      const type = item.type || "";
      const genders = ["ชาย", "หญิง"];
      genders.forEach((gender) => {
        const sizeRows = (item.genderSizeRows && item.genderSizeRows[gender]) || item.sizeRows || [];
        sizeRows.forEach((sizeRow) => {
          const size = sizeRow.size || "";
          const qty = Number(sizeRow.qty || 0);
          const opening = Number(sizeRow.stockOpeningQty || 0);
          const added = Number(sizeRow.stockAdded || 0);
          const adjustedOut = Number(sizeRow.stockAdjustedOut || 0);
          const withdrawn = Number(sizeRow.stockWithdrawn || 0);
          const total = Math.max(0, opening + added - adjustedOut);
          stockRows.push([
            type,
            gender,
            size,
            opening,
            added,
            adjustedOut,
            withdrawn,
            total,
            qty
          ]);
        });
      });
    });

    if (stockRows.length > 0) {
      sheet.getRange(3, 1, stockRows.length, STOCK_HEADERS.length).setValues(stockRows);
      sheet.autoResizeColumns(1, STOCK_HEADERS.length);
    }
  }

  // Apply sheet protection to lock the sheet from manual overrides by other users
  try {
    const protection = sheet.protect().setDescription('Stock Sheet Protected by Dashboard System');
    const me = Session.getActiveUser();
    protection.addEditor(me);
    const editors = protection.getEditors();
    if (editors.length > 0) {
      protection.removeEditors(editors);
    }
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (e) {
    console.warn("Could not apply sheet protection:", e);
  }
}
