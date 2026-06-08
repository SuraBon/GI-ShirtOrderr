import { get } from "@vercel/blob";

const DEFAULT_CACHE_TTL_MS = 30_000;
const NOT_FOUND_CACHE_TTL_MS = 5_000;
const jsonBlobCache = new Map();

async function readStreamText(stream) {
  return new Response(stream).text();
}

export async function readJsonBlob(pathname, { bypassCache = false, ttlMs = DEFAULT_CACHE_TTL_MS } = {}) {
  const cached = jsonBlobCache.get(pathname);
  const now = Date.now();
  if (!bypassCache && cached && cached.expiresAt > now) return cached.value;

  let result;
  try {
    result = await get(pathname, {
      access: "public",
      ifNoneMatch: cached?.etag
    });
  } catch (error) {
    if (!bypassCache && cached && cached.value) {
      console.warn("Serving cached Blob JSON after read failure", { pathname, error });
      cached.expiresAt = now + Math.min(ttlMs, 5_000);
      return cached.value;
    }
    throw error;
  }

  if (!result) {
    const value = null;
    jsonBlobCache.set(pathname, { value, etag: null, expiresAt: now + NOT_FOUND_CACHE_TTL_MS });
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

export function rememberJsonBlob(pathname, value, { etag = null, ttlMs = DEFAULT_CACHE_TTL_MS } = {}) {
  jsonBlobCache.set(pathname, {
    value,
    etag,
    expiresAt: Date.now() + ttlMs
  });
}
