import { createAdminToken, rateLimit, readJsonBody, sendError } from "../_security.js";

function safeCompare(left, right) {
  return String(left || "") === String(right || "");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!rateLimit(request, { key: "dashboard-auth", limit: 8, windowMs: 60_000 })) {
    sendError(response, 429, "Too many attempts");
    return;
  }

  try {
    const configuredPasscode = process.env.DASHBOARD_PASSCODE || "";
    if (!configuredPasscode) {
      console.error("Missing DASHBOARD_PASSCODE");
      sendError(response, 500, "Dashboard auth is not configured");
      return;
    }

    const body = await readJsonBody(request, { maxBytes: 2048 });
    if (!safeCompare(body?.passcode, configuredPasscode)) {
      sendError(response, 401, "Invalid passcode");
      return;
    }

    response.status(200).json({ ok: true, token: createAdminToken() });
  } catch (error) {
    console.error("Dashboard auth failed", error);
    sendError(response, error?.message === "REQUEST_TOO_LARGE" ? 413 : 400, "Invalid request");
  }
}
