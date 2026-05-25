import { getGasAdminToken, readJsonBody, requireAdmin, sendError } from "../_security.js";

const ADMIN_ACTIONS = new Set(["updateStatus", "deleteBatch"]);
const ORDER_STATUSES = new Set(["รอจัดส่ง", "จัดส่งแล้ว"]);

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!ADMIN_ACTIONS.has(payload.action)) return false;
  if (!payload.batchId || typeof payload.batchId !== "string") return false;
  if (payload.action === "updateStatus" && !ORDER_STATUSES.has(payload.status)) return false;
  return true;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    const gasUrl = process.env.VITE_GAS_URL || process.env.GAS_URL || "";
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "Dashboard action source is not configured");
      return;
    }

    const payload = await readJsonBody(request);
    if (!validatePayload(payload)) {
      sendError(response, 400, "Invalid dashboard action");
      return;
    }

    const adminToken = getGasAdminToken();
    if (!adminToken) {
      console.error("Missing GAS_ADMIN_TOKEN");
      sendError(response, 500, "Dashboard actions are not configured");
      return;
    }

    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, adminToken })
    });
    const text = await gasResponse.text();
    response.status(gasResponse.ok ? 200 : 502).setHeader("Content-Type", "application/json");
    response.send(text || JSON.stringify({ success: false }));
  } catch (error) {
    console.error("Dashboard action proxy failed", error);
    sendError(response, error?.message === "REQUEST_TOO_LARGE" ? 413 : 500, "Dashboard action failed");
  }
}
