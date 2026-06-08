import {
  fetchGas,
  getCachedDashboardOrders,
  getConfiguredGasUrl,
  readGasJson,
  setCachedDashboardOrders,
} from "../_gas.js";
import { getGasAdminToken, requireAdmin, sendError } from "../_security.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    const gasUrl = getConfiguredGasUrl();
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "ยังไม่ได้ตั้งค่าแหล่งข้อมูล Google Sheets สำหรับแดชบอร์ด");
      return;
    }

    const requestUrl = new URL(request.url || "/api/dashboard/orders", "http://localhost");
    const forceRefresh = requestUrl.searchParams.get("force") === "1";
    const cached = forceRefresh ? null : getCachedDashboardOrders();
    if (cached) {
      response.status(200).json(cached);
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
    const gasResponse = await fetchGas(url.toString(), { cache: "no-store" });
    const result = await readGasJson(gasResponse);
    if (!gasResponse.ok || result?.success === false) {
      sendError(response, 502, result?.error || "Google Apps Script อ่านข้อมูลไม่สำเร็จ");
      return;
    }
    setCachedDashboardOrders(result);
    response.status(200).json(result);
  } catch (error) {
    console.error("Dashboard orders proxy failed", error);
    sendError(
      response,
      502,
      error?.message === "GAS_TIMEOUT"
        ? "Google Apps Script ตอบกลับช้าเกินไป กรุณาลองโหลดใหม่อีกครั้ง"
        : error?.message === "GAS_HTML_RESPONSE"
          ? "Google Sheets ตอบกลับเป็นหน้าเว็บ HTML (โปรดตรวจสอบสิทธิ์การแชร์ Google Apps Script)"
          : "โหลดข้อมูลแดชบอร์ดจาก Google Sheets ไม่สำเร็จ"
    );
  }
}
