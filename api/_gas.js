export const GAS_TIMEOUT_MS = 45_000;
const GAS_DASHBOARD_CACHE_TTL_MS = 30_000;

let dashboardOrdersCache = null;

export function getConfiguredGasUrl() {
  return String(process.env.VITE_GAS_URL || process.env.GAS_URL || "").trim();
}

export async function fetchGas(url, options = {}) {
  const { timeoutMs = GAS_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("GAS_TIMEOUT");
      timeoutError.cause = error;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function readGasJson(response) {
  const text = await response.text();
  if (!text) return { success: false };

  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error("GAS_INVALID_JSON");
    parseError.cause = error;
    parseError.status = response.status;
    parseError.contentType = response.headers?.get?.("content-type") || "";
    parseError.preview = text.slice(0, 160);
    throw parseError;
  }
}

export function getCachedDashboardOrders() {
  if (!dashboardOrdersCache || dashboardOrdersCache.expiresAt <= Date.now()) return null;
  return dashboardOrdersCache.payload;
}

export function setCachedDashboardOrders(payload) {
  dashboardOrdersCache = {
    payload,
    expiresAt: Date.now() + GAS_DASHBOARD_CACHE_TTL_MS,
  };
}

export function clearCachedDashboardOrders() {
  dashboardOrdersCache = null;
}
