import { del } from "@vercel/blob";
import { rateLimit, readJsonBody, requireAdmin } from "../_security.js";

function isVercelBlobUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      response.status(500).json({ error: "ยังไม่ได้ตั้งค่าพื้นที่เก็บรูป" });
      return;
    }
    if (!rateLimit(request, { key: "blob-delete-image", limit: 30, windowMs: 60_000 })) {
      response.status(429).json({ error: "ลบรูปถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" });
      return;
    }

    const body = await readJsonBody(request, { maxBytes: 2048 });
    const url = String(body?.url || "").trim();
    if (!isVercelBlobUrl(url)) {
      response.status(400).json({ error: "ลิงก์รูปไม่ใช่ Vercel Blob ของระบบ" });
      return;
    }

    await del(url);
    response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Blob image delete failed", error);
    response.status(error?.message === "REQUEST_TOO_LARGE" ? 413 : 500).json({ error: "ลบรูปเสื้อไม่สำเร็จ" });
  }
}
