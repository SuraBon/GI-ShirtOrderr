import { getGasAdminToken, requireAdmin, sendError } from "../_security.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    const gasUrl = process.env.VITE_GAS_URL || process.env.GAS_URL || "";
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "Dashboard data source is not configured");
      return;
    }

    const url = new URL(gasUrl);
    const adminToken = getGasAdminToken();
    if (!adminToken) {
      console.error("Missing GAS_ADMIN_TOKEN");
      sendError(response, 500, "Dashboard data access is not configured");
      return;
    }
    url.searchParams.set("adminToken", adminToken);
    const gasResponse = await fetch(url.toString(), { cache: "no-store" });
    const text = await gasResponse.text();
    response.status(gasResponse.ok ? 200 : 502).setHeader("Content-Type", "application/json");
    response.send(text || JSON.stringify({ success: false }));
  } catch (error) {
    console.error("Dashboard orders proxy failed", error);
    sendError(response, 500, "Could not load dashboard data");
  }
}
