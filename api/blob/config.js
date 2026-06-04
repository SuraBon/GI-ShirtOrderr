import { list, put } from "@vercel/blob";
import { fetchGas, getConfiguredGasUrl } from "../_gas.js";
import { rateLimit, readJsonBody, requireAdmin } from "../_security.js";

function requireBlobToken(response) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return false;
  response.status(500).json({ error: "ยังไม่ได้ตั้งค่าพื้นที่เก็บข้อมูลแบบเสื้อ" });
  return true;
}

const CONFIG_PATH = "shirt-config/clothing-config.json";
const MAX_CONFIG_ITEMS = 100;

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
      response.status(200).json(await configResponse.json());
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
