import { getGasAdminToken, requireAdmin, sendError } from "../_security.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    const gasUrl = process.env.VITE_GAS_URL || process.env.GAS_URL || "";
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "ยังไม่ได้ตั้งค่าแหล่งข้อมูล Google Sheets สำหรับแดชบอร์ด");
      return;
    }

    const url = new URL(gasUrl);
    const adminToken = getGasAdminToken();
    if (!adminToken) {
      console.error("Missing GAS_ADMIN_TOKEN");
      sendError(response, 500, "ยังไม่ได้ตั้งค่าสิทธิ์อ่านข้อมูล Google Sheets");
      return;
    }
    url.searchParams.set("adminToken", adminToken);
    const gasResponse = await fetch(url.toString(), { cache: "no-store" });
    const text = await gasResponse.text();
    response.status(gasResponse.ok ? 200 : 502).setHeader("Content-Type", "application/json");
    response.send(text || JSON.stringify({ success: false }));
  } catch (error) {
    console.error("Dashboard orders proxy failed", error);
    sendError(response, 500, "โหลดข้อมูลแดชบอร์ดจาก Google Sheets ไม่สำเร็จ");
  }
}
