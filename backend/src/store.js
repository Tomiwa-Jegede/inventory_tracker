// M1-M4 in-memory store shaped like schema SQL files.
// Swap to Postgres by replacing these arrays with pg queries.
// Money: integers only (minor units). Stock qty: numbers (base units, user-defined).

export const store = {
  businesses: [
    { id: 'm1-demo-business', name: 'Demo Food Business', currency: 'NGN', timezone: 'Africa/Lagos' },
    { id: 'second-business', name: 'Second Shop (isolation test)', currency: 'NGN', timezone: 'Africa/Lagos' },
  ],
  users: [
    { id: 'owner-1', business_id: 'm1-demo-business', name: 'Owner', email: 'owner@demo.test', role: 'owner' },
    { id: 'staff-1', business_id: 'm1-demo-business', name: 'Staff', email: 'staff@demo.test', role: 'staff' },
    { id: 'owner-2', business_id: 'second-business', name: 'Owner 2', email: 'owner2@demo.test', role: 'owner' },
  ],
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
};

export function resetStore() {
  store.products = [];
  store.sales = [];
  store.dayTotals = [];
  store.ingredients = [];
  store.purchases = [];
  store.recipes = [];
  store.stockAdjustments = [];
  store.overheads = [];
  store.overheadPayments = [];
  store.recurringRules = [];
  store.adjustments = [];
  store.auditLog = [];
  store.ocrLog = [];
}

export function audit(entry) {
  store.auditLog.push({ id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`, created_at: new Date().toISOString(), ...entry });
}

export function makeToken(user) {
  // Demo token (dev/pilot). Production uses JWT via AUTH_SECRET — see auth.js.
  return Buffer.from(`${user.id}:${user.role}:${user.business_id}`).toString('base64');
}

export function parseToken(token) {
  try {
    const [id, role, business_id] = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = store.users.find((u) => u.id === id && u.role === role);
    if (!user) return null;
    return { ...user, business_id: business_id || user.business_id };
  } catch {
    return null;
  }
}

export function publicUser(u) {
  const { password_hash, ...rest } = u;
  return rest;
}
