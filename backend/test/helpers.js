// Shared fixtures: memory-mode businesses + users with REAL passwords.
// Nothing here relies on passwordless login. Tests run with
// NODE_ENV=test + AUTH_SECRET set (see package.json test script).
import bcrypt from 'bcryptjs';
import { resetStore, store } from '../src/store.js';

export const TEST_PASSWORD = 'test-password-123';

export async function seedUsers() {
  resetStore();
  const password_hash = await bcrypt.hash(TEST_PASSWORD, 4);
  store.businesses.push(
    { id: 'test-biz-1', name: 'Test Business 1', currency: 'NGN', timezone: 'Africa/Lagos', created_at: new Date().toISOString() },
    { id: 'test-biz-2', name: 'Test Business 2', currency: 'NGN', timezone: 'Africa/Lagos', created_at: new Date().toISOString() },
  );
  store.users.push(
    { id: 'test-owner-1', business_id: 'test-biz-1', name: 'Owner', email: 'owner@test.local', role: 'owner', password_hash },
    { id: 'test-staff-1', business_id: 'test-biz-1', name: 'Staff', email: 'staff@test.local', role: 'staff', password_hash },
    { id: 'test-owner-2', business_id: 'test-biz-2', name: 'Owner 2', email: 'owner2@test.local', role: 'owner', password_hash },
  );
}

export function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

export async function api(base, path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function login(base, email, password = TEST_PASSWORD) {
  return api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
