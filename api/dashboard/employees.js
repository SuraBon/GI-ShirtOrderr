import { getGasAdminToken, readJsonBody, requireAdmin, sendError } from "../_security.js";

function normalizeEmployee(employee = {}) {
  return {
    name: String(employee.name || "").trim(),
    gender: String(employee.gender || "").trim(),
    branch: String(employee.branch || "").trim(),
    active: employee.active !== false,
  };
}

function validateEmployee(employee) {
  const normalized = normalizeEmployee(employee);
  return Boolean(normalized.name && normalized.gender && normalized.branch);
}

function normalizeEmployeeKey(employeeKey) {
  return String(employeeKey || "").trim();
}

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method)) {
    response.status(405).json({ error: "ไม่รองรับวิธีเรียกใช้งานนี้" });
    return;
  }
  if (!requireAdmin(request, response)) return;

  try {
    const gasUrl = process.env.VITE_GAS_URL || process.env.GAS_URL || "";
    if (!gasUrl || gasUrl.includes("YOUR_SCRIPT_URL")) {
      sendError(response, 500, "ยังไม่ได้ตั้งค่าแหล่งข้อมูล Google Sheets สำหรับข้อมูลพนักงาน");
      return;
    }

    const adminToken = getGasAdminToken();
    if (!adminToken) {
      console.error("Missing GAS_ADMIN_TOKEN");
      sendError(response, 500, "ยังไม่ได้ตั้งค่าสิทธิ์บันทึกข้อมูล Google Sheets");
      return;
    }

    if (request.method === "GET") {
      const url = new URL(gasUrl);
      url.searchParams.set("adminToken", adminToken);
      url.searchParams.set("action", "employees");
      const gasResponse = await fetch(url.toString(), { cache: "no-store" });
      const text = await gasResponse.text();
      response.status(gasResponse.ok ? 200 : 502).setHeader("Content-Type", "application/json");
      response.send(text || JSON.stringify({ success: false }));
      return;
    }

    const payload = await readJsonBody(request);
    if (!payload || !["upsertEmployee", "deleteEmployee"].includes(payload.action)) {
      sendError(response, 400, "คำสั่งข้อมูลพนักงานไม่ถูกต้อง");
      return;
    }
    if (payload.action === "upsertEmployee" && !validateEmployee(payload.employee)) {
      sendError(response, 400, "กรุณาระบุชื่อ เพศ และสาขาให้ครบ");
      return;
    }
    if (payload.action === "deleteEmployee" && !normalizeEmployeeKey(payload.employeeKey)) {
      sendError(response, 400, "ไม่พบข้อมูลพนักงานที่ต้องการปิดใช้งาน");
      return;
    }

    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: payload.action,
        employee: payload.employee ? normalizeEmployee(payload.employee) : undefined,
        employeeKey: normalizeEmployeeKey(payload.employeeKey),
        previousEmployeeKey: normalizeEmployeeKey(payload.previousEmployeeKey),
        adminToken,
      }),
    });
    const text = await gasResponse.text();
    response.status(gasResponse.ok ? 200 : 502).setHeader("Content-Type", "application/json");
    response.send(text || JSON.stringify({ success: false }));
  } catch (error) {
    console.error("Dashboard employees proxy failed", error);
    sendError(
      response,
      error?.message === "REQUEST_TOO_LARGE" ? 413 : 500,
      "บันทึกข้อมูลพนักงานไม่สำเร็จ"
    );
  }
}
