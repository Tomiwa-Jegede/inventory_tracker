import { useEffect, useState } from 'react';

export default function Costs({ token, isOwner }) {
  const [ingredients, setIngredients] = useState([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('piece');
  const [buyIng, setBuyIng] = useState('');
  const [qty, setQty] = useState('');
  const [total, setTotal] = useState('');

  async function load() {
    const [g, s] = await Promise.all([
      fetch('/api/ingredients', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/reports/stock', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (g.ok) setIngredients(await g.json());
    if (s.ok) setIngredients(await s.json());
  }

  useEffect(() => { load(); }, []);

  if (!isOwner) return null;

  async function addIng(e) {
    e.preventDefault();
    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, unit }),
    });
    if (res.ok) { setName(''); load(); }
  }

  async function buy(e) {
    e.preventDefault();
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ingredient_id: buyIng, qty: Number(qty), total_minor: Math.round(Number(total) * 100), purchase_date: new Date().toISOString().slice(0, 10) }),
    });
    if (res.ok) { setQty(''); setTotal(''); load(); }
  }

  return (
    <section>
      <h2>M2: Ingredients + purchases + stock</h2>
      <form onSubmit={addIng}>
        <input placeholder="Ingredient e.g. Bun" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Unit e.g. piece, kg, litre" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <button type="submit">Add ingredient</button>
      </form>
      <form onSubmit={buy}>
        <select value={buyIng} onChange={(e) => setBuyIng(e.target.value)} required>
          <option value="">Select ingredient</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit}) — left: {i.stock_qty}</option>)}
        </select>
        <input placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" required />
        <input placeholder="Total paid" value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" required />
        <button type="submit">Record purchase</button>
      </form>
      <ul>
        {ingredients.map((i) => (
          <li key={i.id}>{i.name}: {i.stock_qty} {i.unit} {i.low ? '— LOW' : ''}</li>
        ))}
      </ul>
    </section>
  );
}
