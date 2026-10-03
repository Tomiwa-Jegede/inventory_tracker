import { useState } from 'react';

export default function Setup({ token, isOwner, onAdded }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Food');

  if (!isOwner) return <p>Setup is owner-only. Staff can enter sales below.</p>;

  async function save(e) {
    e.preventDefault();
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, category, price_minor: Math.round(Number(price) * 100) }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data);
      setName('');
      setPrice('');
    }
  }

  return (
    <section>
      <h2>Business setup (owner)</h2>
      <form onSubmit={save}>
        <input placeholder="Product e.g. Burger" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Category e.g. Food" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input placeholder="Price e.g. 2500" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required />
        <button type="submit">Add product</button>
      </form>
    </section>
  );
}
