import { API_URL, UPCOMING_COUNT } from '../config.js';

const SESSION_KEY = 'inventory-tracker.session';

// Token + user + business live in sessionStorage (survives refresh, gone when
// the tab closes). Everything goes through here so 401 clears in one place.
export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function storedToken() {
  return loadSession()?.token || null;
}

export function authHeaders(token) {
  const t = token || storedToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function apiUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(dateISO, delta) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Render free instances sleep: the first request can take 30-60s while the
// server (and Neon) wakes up. Retry network failures with backoff so the UI
// can show "Waking up the server..." instead of a hard error.
const WAKE_DELAYS_MS = [2000, 5000];

async function fetchWithWakeRetry(url, init) {
  let attempt = 0;
  for (;;) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt >= WAKE_DELAYS_MS.length) throw err;
      await new Promise((r) => setTimeout(r, WAKE_DELAYS_MS[attempt]));
      attempt += 1;
    }
  }
}

export function sessionExpiredError() {
  clearSession();
  const err = new Error('session expired');
  err.code = 401;
  return err;
}

export async function apiFetch(path, token, options = {}) {
  const res = await fetchWithWakeRetry(apiUrl(path), {
    ...options,
    headers: { ...(options.headers || {}), ...authHeaders(token) },
  });
  if (res.status === 401) throw sessionExpiredError();
  return res;
}

// Multipart upload (receipt photos): same base URL + auth + retry, but no
// JSON Content-Type — the browser sets the multipart boundary itself.
export async function apiUpload(path, token, formData) {
  const res = await fetchWithWakeRetry(apiUrl(path), {
    method: 'POST',
    headers: { ...authHeaders(token) },
    body: formData,
  });
  if (res.status === 401) throw sessionExpiredError();
  return res;
}

export { UPCOMING_COUNT };

// Resolve a stored receipt reference to a viewable URL. Legacy/local refs
// (/uploads/...) are returned as-is; R2 object keys go through the
// business-scoped signed-URL endpoint (bucket stays private).
export async function resolveReceiptUrl(token, ref) {
  if (!ref) return null;
  if (/^https?:\/\//.test(ref) || ref.startsWith('/uploads/')) return ref;
  const res = await apiFetch(`/api/receipts/url?key=${encodeURIComponent(ref)}`, token);
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.url || null;
}

// Daily entries -> CSV (backend values only). Used by Today export.
export function dailyToCSV(daily, salesRows) {
  const lines = ['sale_date,product_id,qty,total_minor'];
  for (const s of salesRows?.sales || []) {
    lines.push([daily.sale_date, s.product_id, s.qty, s.total_minor].join(','));
  }
  for (const t of salesRows?.dayTotals || []) {
    lines.push([daily.sale_date, 'QUICK_TOTAL', 1, t.total_minor].join(','));
  }
  return lines.join('\n');
}
