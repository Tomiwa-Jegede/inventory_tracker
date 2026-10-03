import { useState } from 'react';

export default function Recipes({ token, isOwner, products }) {
  const [productId, setProductId] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [ingId, setIngId] = useState('');
  const [qty, setQty] = useState('');

  if (!isOwner) return null;

  async function loadIng() {
    const res = await fetch('/api/ingredients', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setIngredients(await res.json());
  }

  async function link(e) {
    e.preventDefault();
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, ingredient_id: ingId, qty_per_sale: Number(qty) }),
    });
    if (res.ok) setQty('');
  }

  return (
    <section onMouseEnter={loadIng}>
      <h2>M2: Recipes (product → ingredients)</h2>
      <form onSubmit={link}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={ingId} onChange={(e) => setIngId(e.target.value)} required onFocus={loadIng}>
          <option value="">Ingredient</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input placeholder="Qty per sale" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" required />
        <button type="submit">Link</button>
      </form>
      <p>Leave empty for services with no materials — profit is full price.</p>
    </section>
  );
}
