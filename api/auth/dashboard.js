import { createAdminToken, rateLimit, readJsonBody, sendError } from "../_security.js";

function safeCompare(left, right) {
  return String(left || "") === String(right || "");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }

  if (!rateLimit(request, { key: "dashboard-auth", limit: 8, windowMs: 60_000 })) {
    sendError(response, 429, "ลองเข้าระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่");
    return;
  }

  try {
    const configuredPasscode =
      process.env.DASHBOARD_PASSCODE ||
      process.env.VITE_DASHBOARD_PASSCODE ||
      "";
    if (!configuredPasscode) {
      console.error("Missing DASHBOARD_PASSCODE or VITE_DASHBOARD_PASSCODE");
      sendError(response, 500, "ยังไม่ได้ตั้งค่ารหัสเข้าแดชบอร์ด");
      return;
    }

    const body = await readJsonBody(request, { maxBytes: 2048 });
    if (!safeCompare(body?.passcode, configuredPasscode)) {
      sendError(response, 401, "รหัสเข้าแดชบอร์ดไม่ถูกต้อง");
      return;
    }

    response.status(200).json({ ok: true, token: createAdminToken() });
  } catch (error) {
    console.error("Dashboard auth failed", error);
    sendError(response, error?.message === "REQUEST_TOO_LARGE" ? 413 : 400, "ข้อมูลที่ส่งมาไม่ถูกต้อง");
  }
}
