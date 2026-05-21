import { handleUpload } from "@vercel/blob/client";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await request.json();
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        addRandomSuffix: true
      }),
      onUploadCompleted: async () => {}
    });
    response.status(200).json(jsonResponse);
  } catch (error) {
    response.status(400).json({ error: error?.message || "Upload failed" });
  }
}
