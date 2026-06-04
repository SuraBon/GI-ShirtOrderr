import { clearCachedDashboardOrders, fetchGas, getConfiguredGasUrl, readGasJson } from "../_gas.js";
import { rateLimit, readJsonBody, sendError } from "../_security.js";

const ORDER_STATUS_PENDING = "รอจัดส่ง";
const MAX_ORDERS = 300;
const MAX_ITEMS_PER_ORDER = 20;

function cleanText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanQty(value) {
  const qty = Number(value || 0);
  return Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (!payload.batchId || !Array.isArray(payload.orders) || !payload.orders.length) return null;
  if (payload.orders.length > MAX_ORDERS) return null;

  const orders = payload.orders
    .map((order) => ({
      name: cleanText(order?.name, 120),
      gender: cleanText(order?.gender, 40),
      items: Array.isArray(order?.items)
        ? order.items
            .slice(0, MAX_ITEMS_PER_ORDER)
            .map((item) => ({
              type: cleanText(item?.type, 120),
              size: cleanText(item?.size, 80),
              qty: cleanQty(item?.qty),
            }))
            .filter((item) => item.type && item.size && item.qty > 0)
        : [],
    }))
    .filter((order) => order.name && order.gender && order.items.length);

  if (!orders.length) return null;

  const now = new Date().toISOString();
  return {
    batchId: cleanText(payload.batchId, 80),
    companyName: cleanText(payload.companyName, 200),
    branch: cleanText(payload.branch, 120),
    supervisorName: cleanText(payload.supervisorName, 120),
    supervisorPhone: cleanText(payload.supervisorPhone, 30),
    submittedAt: cleanText(payload.submittedAt, 40) || now,
    status: ORDER_STATUS_PENDING,
    statusUpdatedAt: cleanText(payload.statusUpdatedAt, 40) || now,
    orders,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }

  if (!rateLimit(request, { key: "order-submit", limit: 20, windowMs: 60_000 })) {
    sendError(response, 429, "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่");
    return;
  }

  try {
    const gasUrl = getConfiguredGasUrl();
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "ยังไม่ได้ตั้งค่าแหล่งข้อมูลสำหรับบันทึกคำสั่งเบิก");
      return;
    }

    const payload = normalizePayload(await readJsonBody(request));
    if (!payload) {
      sendError(response, 400, "ข้อมูลคำสั่งเบิกไม่ครบถ้วนหรือไม่ถูกต้อง");
      return;
    }

    const gasResponse = await fetchGas(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const result = await readGasJson(gasResponse);
    if (!gasResponse.ok || result?.success === false) {
      sendError(response, 502, result?.error || "Google Apps Script บันทึกคำสั่งเบิกไม่สำเร็จ");
      return;
    }
    clearCachedDashboardOrders();
    response.status(200).json(result);
  } catch (error) {
    console.error("Order submit proxy failed", error);
    sendError(
      response,
      error?.message === "REQUEST_TOO_LARGE" ? 413 : 502,
      error?.message === "GAS_TIMEOUT"
        ? "Google Apps Script ตอบกลับช้าเกินไป กรุณาลองส่งใหม่อีกครั้ง"
        : "ส่งคำสั่งเบิกไม่สำเร็จ"
    );
  }
}
