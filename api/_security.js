import crypto from "node:crypto";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 128 * 1024;
const rateBuckets = new Map();

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function getSessionSecret() {
  return (
    process.env.DASHBOARD_SESSION_SECRET ||
    process.env.VITE_DASHBOARD_SESSION_SECRET ||
    process.env.ADMIN_SHARED_SECRET ||
    process.env.DASHBOARD_PASSCODE ||
    process.env.VITE_DASHBOARD_PASSCODE ||
    ""
  );
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getClientIp(request) {
  return String(
    request.headers?.["x-forwarded-for"] ||
    request.headers?.["x-real-ip"] ||
    request.socket?.remoteAddress ||
    "unknown"
  ).split(",")[0].trim();
}

export function rateLimit(request, { key = "default", limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucketKey = `${key}:${getClientIp(request)}`;
  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export async function readJsonBody(request, { maxBytes = MAX_JSON_BYTES } = {}) {
  if (typeof request.json === "function") return request.json();
  if (typeof request.body === "string") {
    if (Buffer.byteLength(request.body) > maxBytes) throw new Error("REQUEST_TOO_LARGE");
    return JSON.parse(request.body || "{}");
  }
  if (Buffer.isBuffer(request.body)) {
    if (request.body.length > maxBytes) throw new Error("REQUEST_TOO_LARGE");
    return JSON.parse(request.body.toString("utf8") || "{}");
  }
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body;

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function createAdminToken() {
  const payload = base64url(JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(12).toString("base64url")
  }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token) {
  if (!token || !getSessionSecret()) return false;
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(data.exp || 0) > Date.now();
  } catch {
    return false;
  }
}

export function getBearerToken(request) {
  const header = String(request.headers?.authorization || request.headers?.Authorization || "");
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export function requireAdmin(request, response) {
  if (verifyAdminToken(getBearerToken(request))) return true;
  response.status(401).json({ error: "สิทธิ์เข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  return false;
}

export function getGasAdminToken() {
  return (
    process.env.GAS_ADMIN_TOKEN ||
    process.env.VITE_GAS_ADMIN_TOKEN ||
    process.env.ADMIN_SHARED_SECRET ||
    ""
  );
}

export function sendError(response, status, message = "ดำเนินการไม่สำเร็จ") {
  response.status(status).json({ error: message });
}
