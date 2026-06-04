import { list, put } from "@vercel/blob";
import { fetchGas, getConfiguredGasUrl, readGasJson } from "../_gas.js";
import { getGasAdminToken, rateLimit, readJsonBody, requireAdmin } from "../_security.js";

function requireBlobToken(response) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return false;
  response.status(500).json({ error: "ยังไม่ได้ตั้งค่าพื้นที่เก็บข้อมูลแบบเสื้อ" });
  return true;
}

const CONFIG_PATH = "shirt-config/clothing-config.json";
const MAX_CONFIG_ITEMS = 100;
const STOCK_FIELDS = ["qty", "stockOpeningQty", "stockAdded", "stockWithdrawn", "stockAdjustedOut"];

function runAfterResponse(request, promise) {
  if (typeof request.waitUntil === "function") {
    request.waitUntil(promise);
    return;
  }
  promise.catch((error) => {
    console.error("Background task failed", error);
  });
}

async function syncStockToGoogleSheets(config) {
  const gasUrl = getConfiguredGasUrl();
  const adminToken = String(process.env.GAS_ADMIN_TOKEN || process.env.ADMIN_SHARED_SECRET || "").trim();
  if (!gasUrl || !adminToken) return;

  await fetchGas(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "syncStock", config, adminToken })
  });
}

async function loadStockRowsFromGoogleSheets() {
  const gasUrl = getConfiguredGasUrl();
  const adminToken = getGasAdminToken();
  if (!gasUrl || !adminToken) return [];

  const url = new URL(gasUrl);
  url.searchParams.set("adminToken", adminToken);
  url.searchParams.set("action", "stock");
  const gasResponse = await fetchGas(url.toString(), { cache: "no-store", timeoutMs: 12_000 });
  const result = await readGasJson(gasResponse);
  return gasResponse.ok && result?.success !== false && Array.isArray(result?.data) ? result.data : [];
}

function getStockKey(type, gender, size) {
  return [type, gender, size].map((value) => String(value || "").trim()).join("\u0000");
}

function normalizeStockFields(stockRow) {
  const qty = Number(stockRow?.qty || 0);
  const stockAdded = Number(stockRow?.stockAdded || 0);
  const stockWithdrawn = Number(stockRow?.stockWithdrawn || 0);
  const stockAdjustedOut = Number(stockRow?.stockAdjustedOut || 0);
  const rawOpeningQty = Number(stockRow?.stockOpeningQty || 0);
  const rawTotalStock = Number(stockRow?.totalStock || 0);
  const hasLedgerTotal = rawOpeningQty + stockAdded - stockAdjustedOut > 0 || rawTotalStock > 0;
  const stockOpeningQty = hasLedgerTotal
    ? rawOpeningQty
    : Math.max(0, qty + stockWithdrawn - stockAdded + stockAdjustedOut);

  return {
    qty,
    stockOpeningQty,
    stockAdded,
    stockWithdrawn,
    stockAdjustedOut,
  };
}

function mergeStockRowsIntoConfig(config, stockRows) {
  if (!Array.isArray(config) || !Array.isArray(stockRows) || !stockRows.length) return config;
  const stockByKey = new Map(
    stockRows.map((row) => [getStockKey(row.type, row.gender, row.size), row])
  );

  return config.map((item) => {
    const nextGenderSizeRows = { ...(item.genderSizeRows || {}) };
    for (const [gender, rows] of Object.entries(nextGenderSizeRows)) {
      nextGenderSizeRows[gender] = Array.isArray(rows)
        ? rows.map((row) => {
            const stockRow = stockByKey.get(getStockKey(item.type, gender, row.size));
            if (!stockRow) return row;
            const normalizedStock = normalizeStockFields(stockRow);
            return STOCK_FIELDS.reduce(
              (nextRow, field) => ({ ...nextRow, [field]: normalizedStock[field] }),
              row
            );
          })
        : rows;
    }

    return {
      ...item,
      genderSizeRows: nextGenderSizeRows,
      sizeRows: nextGenderSizeRows.ชาย || item.sizeRows,
    };
  });
}

export default async function handler(request, response) {
  if (requireBlobToken(response)) return;

  try {
    if (request.method === "GET") {
      const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
      const blob = blobs.find((entry) => entry.pathname === CONFIG_PATH);
      if (!blob) {
        response.status(200).json({ config: null });
        return;
      }

      const configResponse = await fetch(blob.url, { cache: "no-store" });
      if (!configResponse.ok) throw new Error("อ่านข้อมูลแบบเสื้อไม่สำเร็จ");
      const payload = await configResponse.json();
      const stockRows = await loadStockRowsFromGoogleSheets().catch((error) => {
        console.error("Failed to load stock rows from Google Sheets:", error);
        return [];
      });
      response.status(200).json({
        ...payload,
        config: mergeStockRowsIntoConfig(payload?.config, stockRows),
        stockSource: stockRows.length ? "google-sheets" : "blob"
      });
      return;
    }

    if (request.method === "POST") {
      if (!requireAdmin(request, response)) return;
      if (!rateLimit(request, { key: "blob-config", limit: 30, windowMs: 60_000 })) {
        response.status(429).json({ error: "บันทึกข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" });
        return;
      }
      const body = await readJsonBody(request);
      const config = Array.isArray(body?.config) ? body.config : [];
      const expected = body?.expectedUpdatedAt || null;
      if (!config.length || config.length > MAX_CONFIG_ITEMS) {
        response.status(400).json({ error: "ข้อมูลแบบเสื้อไม่ถูกต้อง" });
        return;
      }

      // Read current blob to support optimistic concurrency
      const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
      const existing = blobs.find((entry) => entry.pathname === CONFIG_PATH);
      if (existing) {
        const currentResponse = await fetch(existing.url, { cache: 'no-store' });
        if (currentResponse.ok) {
          const currentJson = await currentResponse.json().catch(() => null);
          const currentUpdatedAt = currentJson?.updatedAt || null;
          if (expected && currentUpdatedAt && expected !== currentUpdatedAt) {
            response.status(409).json({ error: 'ข้อมูลแบบเสื้อมีการอัปเดตจากที่อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่', current: currentJson });
            return;
          }
        }
      } else {
        if (expected) {
          // Expected a version but none exists
          response.status(409).json({ error: 'ข้อมูลแบบเสื้อมีการอัปเดตจากที่อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่', current: null });
          return;
        }
      }

      const payload = JSON.stringify({ config, updatedAt: new Date().toISOString() });
      const blob = await put(CONFIG_PATH, payload, {
        access: "public",
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60
      });

      runAfterResponse(
        request,
        syncStockToGoogleSheets(config).catch((error) => {
          console.error("Failed to sync stock to Google Sheets:", error);
        })
      );

      response.status(200).json({
        ok: true,
        url: blob.url,
        updatedAt: JSON.parse(payload).updatedAt,
        stockSync: "queued"
      });
      return;
    }

    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
  } catch (error) {
    console.error("Clothing config sync failed", error);
    response.status(error?.message === "REQUEST_TOO_LARGE" ? 413 : 500).json({ error: "บันทึกข้อมูลแบบเสื้อไม่สำเร็จ" });
  }
}
