import { put } from "@vercel/blob";
import { rateLimit, readJsonBody, requireAdmin } from "../_security.js";
import { readJsonBlob, rememberJsonBlob } from "./_json.js";

function requireBlobToken(response) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return false;
  response.status(500).json({ error: "ยังไม่ได้ตั้งค่าพื้นที่เก็บข้อมูลสาขา" });
  return true;
}

const BRANCHES_PATH = "shirt-config/branches.json";
const MAX_BRANCHES = 100;

export default async function handler(request, response) {
  if (requireBlobToken(response)) return;

  try {
    if (request.method === "GET") {
      const payload = await readJsonBlob(BRANCHES_PATH);
      if (!payload) {
        response.status(200).json({ branches: null });
        return;
      }

      response.status(200).json(payload);
      return;
    }

    if (request.method === "POST") {
      if (!requireAdmin(request, response)) return;
      if (!rateLimit(request, { key: "blob-branches", limit: 30, windowMs: 60_000 })) {
        response.status(429).json({ error: "บันทึกข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" });
        return;
      }
      const body = await readJsonBody(request);
      const branches = Array.isArray(body?.branches) ? body.branches : [];
      const expected = body?.expectedUpdatedAt || null;
      
      if (!branches.length || branches.length > MAX_BRANCHES) {
        response.status(400).json({ error: "ข้อมูลสาขาไม่ถูกต้อง (ต้องมี 1-" + MAX_BRANCHES + " สาขา)" });
        return;
      }

      // Validate branch data
      if (!branches.every(b => typeof b === 'string' && b.trim().length > 0)) {
        response.status(400).json({ error: "ชื่อสาขาต้องไม่ว่างเปล่า" });
        return;
      }

      // Read current blob to support optimistic concurrency
      const currentJson = await readJsonBlob(BRANCHES_PATH, { bypassCache: true });
      if (currentJson) {
        const currentUpdatedAt = currentJson?.updatedAt || null;
        if (expected && currentUpdatedAt && expected !== currentUpdatedAt) {
          response.status(409).json({ 
            error: 'ข้อมูลสาขามีการอัปเดตจากที่อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่', 
            current: currentJson 
          });
          return;
        }
      } else {
        if (expected) {
          response.status(409).json({ 
            error: 'ข้อมูลสาขามีการอัปเดตจากที่อื่น กรุณาโหลดข้อมูลล่าสุดแล้วลองใหม่', 
            current: null 
          });
          return;
        }
      }

      const nextPayload = { branches, updatedAt: new Date().toISOString() };
      const payload = JSON.stringify(nextPayload);
      const branchBlob = await put(BRANCHES_PATH, payload, {
        access: "public",
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60
      });

      rememberJsonBlob(BRANCHES_PATH, nextPayload, { etag: branchBlob.etag });

      response.status(200).json({ 
        ok: true, 
        url: branchBlob.url, 
        updatedAt: nextPayload.updatedAt
      });
      return;
    }

    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
  } catch (error) {
    console.error("Branches sync failed", error);
    response.status(error?.message === "REQUEST_TOO_LARGE" ? 413 : 500).json({ 
      error: "บันทึกข้อมูลสาขาไม่สำเร็จ" 
    });
  }
}
