import { list, put } from "@vercel/blob";

const CONFIG_PATH = "shirt-config/clothing-config.json";

async function readRequestBody(request) {
  if (typeof request.json === "function") return request.json();
  if (request.body && typeof request.body === "object") return request.body;

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function requireBlobToken(response) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return false;
  response.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });
  return true;
}

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
      const body = await readRequestBody(request);
      const config = Array.isArray(body?.config) ? body.config : [];
      if (!config.length) {
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
    response.status(500).json({ error: error?.message || "Clothing config sync failed" });
  }
}
