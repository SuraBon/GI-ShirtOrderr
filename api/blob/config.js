import { list, put } from "@vercel/blob";
import { rateLimit, readJsonBody, requireAdmin } from "../_security.js";

function requireBlobToken(response) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return false;
  response.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });
  return true;
}

const CONFIG_PATH = "shirt-config/clothing-config.json";
const MAX_CONFIG_ITEMS = 100;

export default async function handler(request, response) {
  if (requireBlobToken(response)) return;

  try {
    if (request.method === "GET") {
      const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
      const blob = blobs.find((entry) => entry.pathname === CONFIG_PATH);
      if (!blob) {
        response.status(200).json({ config: null });
        return;
      }

      const configResponse = await fetch(blob.url, { cache: "no-store" });
      if (!configResponse.ok) throw new Error("Could not read clothing config");
      response.status(200).json(await configResponse.json());
      return;
    }

    if (request.method === "POST") {
      if (!requireAdmin(request, response)) return;
      if (!rateLimit(request, { key: "blob-config", limit: 30, windowMs: 60_000 })) {
        response.status(429).json({ error: "Too many requests" });
        return;
      }
      const body = await readJsonBody(request);
      const config = Array.isArray(body?.config) ? body.config : [];
      if (!config.length || config.length > MAX_CONFIG_ITEMS) {
        response.status(400).json({ error: "Invalid clothing config" });
        return;
      }

      const payload = JSON.stringify({ config, updatedAt: new Date().toISOString() });
      const blob = await put(CONFIG_PATH, payload, {
        access: "public",
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60
      });
      response.status(200).json({ ok: true, url: blob.url });
      return;
    }

    response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Clothing config sync failed", error);
    response.status(error?.message === "REQUEST_TOO_LARGE" ? 413 : 500).json({ error: "Clothing config sync failed" });
  }
}
