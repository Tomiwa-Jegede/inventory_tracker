// M1-M4 in-memory store shaped like schema SQL files.
// Memory mode is for local dev and tests only: the server refuses to boot
// into memory mode when NODE_ENV=production (see src/config.js).
// Fixtures (businesses, users) are created by tests or the bootstrap owner
// flow — nothing demo-specific lives here.

export const store = {
  businesses: [],
  users: [],
  products: [],
  sales: [],
  dayTotals: [],
  // M2
  ingredients: [],
  purchases: [],
  recipes: [],
  stockAdjustments: [],
  // M3
  overheads: [],
  overheadPayments: [],
  // M4
  recurringRules: [],
  adjustments: [],
  auditLog: [],
  // M5 stop point
  ocrLog: [],
  // R2-mode receipt ledger mirror
  receipts: [],
};

export function resetStore() {
  for (const key of Object.keys(store)) {
    store[key] = [];
  }
}

export function audit(entry) {
  store.auditLog.push({ id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`, created_at: new Date().toISOString(), ...entry });
}

export function publicUser(u) {
  const { password_hash, ...rest } = u;
  return rest;
}
