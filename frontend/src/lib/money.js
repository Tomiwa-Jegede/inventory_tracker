// Money formatting. Currency/timezone come from the BUSINESS RECORD (login
// response / GET /api/auth/me) — never from a frontend env var or hardcoded
// constant. One source of truth, supports multiple businesses later.
let businessPrefs = { currency: 'USD', timezone: 'UTC' };

try {
  const raw = sessionStorage.getItem('inventory-tracker.business');
  if (raw) businessPrefs = { ...businessPrefs, ...JSON.parse(raw) };
} catch {
  // Pre-login: placeholder prefs until the business record arrives.
}

export function setBusinessPrefs(business) {
  if (!business) return;
  businessPrefs = {
    currency: business.currency || businessPrefs.currency,
    timezone: business.timezone || businessPrefs.timezone,
  };
  sessionStorage.setItem('inventory-tracker.business', JSON.stringify(businessPrefs));
}

export function getBusinessPrefs() {
  return { ...businessPrefs };
}

function formatter() {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: businessPrefs.currency,
    minimumFractionDigits: 2,
  });
}

export function formatMoney(minor) {
  if (minor == null) return '—';
  try {
    return formatter().format(Number(minor) / 100);
  } catch {
    return `${businessPrefs.currency} ${(Number(minor) / 100).toFixed(2)}`;
  }
}

// Parse user-typed major units ("2500", "2,500.50") to integer minor units.
export function parseMajorToMinor(input) {
  if (input == null || String(input).trim() === '') return null;
  const cleaned = String(input).replace(/[^0-9.]/g, '');
  if (cleaned === '') return null;
  const n = Math.round(Number(cleaned) * 100);
  return Number.isFinite(n) ? n : null;
}
