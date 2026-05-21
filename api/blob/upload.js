import { handleUpload } from "@vercel/blob/client";

async function readUploadBody(request) {
  if (typeof request.json === "function") return request.json();
  if (request.body && typeof request.body === "object") return request.body;

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      response.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });
      return;
    }

    const body = await readUploadBody(request);
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        addRandomSuffix: true
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("shirt image upload completed", blob.url);
      }
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({ error: error?.message || "Upload failed" });
  }
}
