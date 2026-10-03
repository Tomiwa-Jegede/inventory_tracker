import { useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

export default function Sales({ token, products, onSold }) {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [quickTotal, setQuickTotal] = useState('');
  const [photo, setPhoto] = useState(null);

  async function uploadPhoto() {
    if (!photo) return null;
    const form = new FormData();
    form.append('receipt', photo);
    const res = await fetch('/api/receipts/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    return res.ok ? data.url : null;
  }

  async function saveItem(e) {
    e.preventDefault();
    const receipt_photo_url = await uploadPhoto();
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        product_id: productId,
        sale_date: today(),
        qty: Number(qty),
        ...(receipt_photo_url ? { receipt_photo_url } : {}),
      }),
    });
    if (res.ok) {
      setQty(1);
      setPhoto(null);
      onSold();
    }
  }

  async function saveQuick(e) {
    e.preventDefault();
    const res = await fetch('/api/sales/day-total', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sale_date: today(), total_minor: Math.round(Number(quickTotal) * 100) }),
    });
    if (res.ok) {
      setQuickTotal('');
      onSold();
    }
  }

  return (
    <section>
      <h2>Daily sales (fast entry)</h2>
      <form onSubmit={saveItem}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {(p.price_minor / 100).toFixed(2)}</option>
          ))}
        </select>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0] || null)} />
        <button type="submit">Record sale</button>
      </form>
      <form onSubmit={saveQuick}>
        <h3>Busy-hour quick total (no breakdown)</h3>
        <input placeholder="Total in drawer e.g. 45000" value={quickTotal} onChange={(e) => setQuickTotal(e.target.value)} inputMode="decimal" required />
        <button type="submit">Save total only</button>
      </form>
    </section>
  );
}
