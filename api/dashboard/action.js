import { clearCachedDashboardOrders, fetchGas, getConfiguredGasUrl, readGasJson } from "../_gas.js";
import { getGasAdminToken, readJsonBody, requireAdmin, sendError } from "../_security.js";

const ADMIN_ACTIONS = new Set(["updateStatus", "deleteBatch", "shipItems", "syncStock"]);
const ORDER_STATUSES = new Set(["รอจัดส่ง", "จัดส่งแล้ว", "ยกเลิก"]);

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!ADMIN_ACTIONS.has(payload.action)) return false;
  if (payload.action === "syncStock") {
    return Array.isArray(payload.config);
  }
  if (!payload.batchId || typeof payload.batchId !== "string") return false;
  if (payload.action === "updateStatus" && !ORDER_STATUSES.has(payload.status)) return false;
  if (payload.action === "shipItems") {
    return Array.isArray(payload.items);
  }
  return true;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    const gasUrl = getConfiguredGasUrl();
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "ยังไม่ได้ตั้งค่าแหล่งข้อมูล Google Sheets สำหรับบันทึกแดชบอร์ด");
      return;
    }

    const payload = await readJsonBody(request);
    if (!validatePayload(payload)) {
      sendError(response, 400, "คำสั่งจากแดชบอร์ดไม่ถูกต้อง");
      return;
    }

    const adminToken = getGasAdminToken();
    if (!adminToken) {
      console.error("Missing GAS_ADMIN_TOKEN");
      sendError(response, 500, "ยังไม่ได้ตั้งค่าสิทธิ์บันทึกข้อมูล Google Sheets");
      return;
    }

    const gasResponse = await fetchGas(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, adminToken })
    });
    const result = await readGasJson(gasResponse);
    if (!gasResponse.ok || result?.success === false) {
      sendError(response, 502, result?.error || "Google Apps Script บันทึกข้อมูลไม่สำเร็จ");
      return;
    }
    clearCachedDashboardOrders();
    response.status(200).json(result);
  } catch (error) {
    console.error("Dashboard action proxy failed", error);
    sendError(
      response,
      error?.message === "REQUEST_TOO_LARGE" ? 413 : 502,
      error?.message === "GAS_TIMEOUT"
        ? "Google Apps Script ตอบกลับช้าเกินไป กรุณาลองใหม่อีกครั้ง"
        : "บันทึกข้อมูลแดชบอร์ดไม่สำเร็จ"
    );
  }
}
