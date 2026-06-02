export const APPS_SCRIPT_URL = import.meta.env.VITE_GAS_URL || 'YOUR_SCRIPT_URL_HERE';
export const DASHBOARD_PATH = '#/dashboard';
export const ORDER_PATH = '/';
export const DASHBOARD_SESSION_KEY = 'gi-dashboard-admin-token';

export function getAdminToken() {
  return sessionStorage.getItem(DASHBOARD_SESSION_KEY) || '';
}

export function setAdminToken(token) {
  if (token) sessionStorage.setItem(DASHBOARD_SESSION_KEY, token);
  else sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
}

export function isAuthFailure(error) {
  return error?.status === 401 || String(error?.message || '').includes('สิทธิ์');
}

export async function authFetch(url, options = {}) {
  const token = getAdminToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      const error = new Error('สิทธิ์เข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      error.status = 401;
      throw error;
    }
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw err;
  }
}

export function isGasConfigured() {
  return Boolean(APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('YOUR_SCRIPT_URL'));
}
