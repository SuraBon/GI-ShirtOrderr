import { handleUpload } from "@vercel/blob/client";
import { rateLimit, readJsonBody, verifyAdminToken } from "../_security.js";

async function readUploadBody(request) {
  return readJsonBody(request);
}

function getUploadToken(...args) {
  const candidate = args.find((value) => value && typeof value === "object" && "clientPayload" in value);
  const clientPayload = candidate?.clientPayload || args.find((value) => typeof value === "string") || "";
  if (!clientPayload) return "";
  try {
    const parsed = JSON.parse(clientPayload);
    return parsed?.token || "";
  } catch {
    return "";
  }
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
    if (!rateLimit(request, { key: "blob-upload", limit: 30, windowMs: 60_000 })) {
      response.status(429).json({ error: "Too many requests" });
      return;
    }

    const body = await readUploadBody(request);
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (...args) => {
        if (!verifyAdminToken(getUploadToken(...args))) throw new Error("Unauthorized");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("shirt image upload completed", blob.url);
      }
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Upload failed", error);
    response.status(error?.message === "Unauthorized" ? 401 : 400).json({ error: error?.message === "Unauthorized" ? "Unauthorized" : "Upload failed" });
  }
}
