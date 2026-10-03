import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApp } from '../src/app.js';
import { login, listen, api, seedUsers, authHeader } from './helpers.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 0),
]);

async function upload(base, token, buffer, filename, mime) {
  const form = new FormData();
  form.append('receipt', new Blob([buffer], { type: mime }), filename);
  const res = await fetch(`${base}/api/receipts/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

test('Receipts: content-sniffed upload, key storage, business-scoped view URLs', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  let key = null;
  try {
    const o1 = await login(base, 'owner@test.local');
    const o2 = await login(base, 'owner2@test.local');
    const H1 = authHeader(o1.body.token);
    const H2 = authHeader(o2.body.token);

    // Real PNG bytes → 201, object KEY (not URL) scoped to the business.
    const up = await upload(base, o1.body.token, PNG, 'r.png', 'image/png');
    assert.equal(up.status, 201);
    key = up.body.key;
    assert.ok(key.startsWith('test-biz-1/'));
    assert.ok(up.body.id);

    // Fake image (text bytes with image MIME) → rejected by content sniffing.
    const fake = await upload(base, o1.body.token, Buffer.alloc(32, 65), 'evil.png', 'image/png');
    assert.equal(fake.status, 400);

    // Owner resolves their own key → view URL.
    const view = await api(base, `/api/receipts/url?key=${encodeURIComponent(key)}`, { headers: H1 });
    assert.equal(view.status, 200);
    assert.ok(view.body.url);

    // Other business asks for the same key → 404 (no cross-business viewing).
    const cross = await api(base, `/api/receipts/url?key=${encodeURIComponent(key)}`, { headers: H2 });
    assert.equal(cross.status, 404);

    // Receipt-id endpoint: owner ok, other business 404.
    const byId = await api(base, `/api/receipts/${up.body.id}/url`, { headers: H1 });
    assert.equal(byId.status, 200);
    const byIdCross = await api(base, `/api/receipts/${up.body.id}/url`, { headers: H2 });
    assert.equal(byIdCross.status, 404);
  } finally {
    server.close();
    if (key) {
      const f = `uploads/test-biz-1/${key.split('/').pop()}`;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
});
