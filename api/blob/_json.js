import { get } from "@vercel/blob";

const DEFAULT_CACHE_TTL_MS = 30_000;
const jsonBlobCache = new Map();

async function readStreamText(stream) {
  return new Response(stream).text();
}

export async function readJsonBlob(pathname, { bypassCache = false, ttlMs = DEFAULT_CACHE_TTL_MS } = {}) {
  const cached = jsonBlobCache.get(pathname);
  const now = Date.now();
  if (!bypassCache && cached && cached.expiresAt > now) return cached.value;

  const result = await get(pathname, {
    access: "public",
    ifNoneMatch: cached?.etag
  });

  if (!result) {
    const value = null;
    jsonBlobCache.set(pathname, { value, etag: null, expiresAt: now + ttlMs });
    return value;
  }

  if (result.statusCode === 304 && cached) {
    cached.expiresAt = now + ttlMs;
    return cached.value;
  }

  const value = JSON.parse(await readStreamText(result.stream));
  jsonBlobCache.set(pathname, {
    value,
    etag: result.blob.etag,
    expiresAt: now + ttlMs
  });
  return value;
}

export function rememberJsonBlob(pathname, value, { ttlMs = DEFAULT_CACHE_TTL_MS } = {}) {
  jsonBlobCache.set(pathname, {
    value,
    etag: null,
    expiresAt: Date.now() + ttlMs
  });
}
