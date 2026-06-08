import { handleUpload } from "@vercel/blob/client";
import { rateLimit, readJsonBody, verifyAdminToken } from "../_security.js";

async function readUploadBody(request) {
  return readJsonBody(request);
}

function getUploadToken(...args) {
  const candidate = args.find((value) => value && typeof value === "object" && "clientPayload" in value);
  if (candidate) {
    try {
      const parsed = JSON.parse(candidate.clientPayload || "");
      return parsed?.token || "";
    } catch {
      return "";
    }
  }

  for (const arg of args) {
    if (typeof arg === "string") {
      try {
        const parsed = JSON.parse(arg);
        if (parsed && typeof parsed === "object" && "token" in parsed) {
          return parsed.token || "";
        }
      } catch {
        // ignore non-token JSON string
      }
    }
  }
  return "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      response.status(500).json({ error: "ยังไม่ได้ตั้งค่าพื้นที่อัปโหลดรูป" });
      return;
    }
    if (!rateLimit(request, { key: "blob-upload", limit: 30, windowMs: 60_000 })) {
      response.status(429).json({ error: "อัปโหลดถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" });
      return;
    }

    const body = await readUploadBody(request);
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (...args) => {
        if (!verifyAdminToken(getUploadToken(...args))) throw new Error("สิทธิ์อัปโหลดหมดอายุ กรุณาเข้าสู่แดชบอร์ดใหม่");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("shirt image upload completed", blob.url);
      }
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Upload failed", error);
    const isUnauthorized = String(error?.message || "").includes("สิทธิ์");
    response.status(isUnauthorized ? 401 : 400).json({ error: isUnauthorized ? error.message : "อัปโหลดรูปไม่สำเร็จ" });
  }
}
