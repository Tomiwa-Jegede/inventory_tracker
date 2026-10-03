import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, ListRow, Money, Skeleton } from '../components/ui.jsx';
import { apiFetch } from '../lib/api.js';

// Product cost preview is an estimate from latest purchase unit costs.
// Record cost stays backend-computed and frozen at sale time.
export default function Recipes({ token, isOwner, sessionExpired }) {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [productId, setProductId] = useState('');
  const [lines, setLines] = useState([]);
  const [ingId, setIngId] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function boot() {
    setLoading(true);
    setError('');
    try {
      const [p, i, pu] = await Promise.all([
        apiFetch('/api/products?include_archived=1', token),
        apiFetch('/api/ingredients', token),
        apiFetch('/api/purchases', token),
      ]);
      if (p.ok) setProducts(await p.json());
      if (i.ok) setIngredients(await i.json());
      if (pu.ok) setPurchases(await pu.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load recipes. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  async function loadLines(pid) {
    if (!pid) { setLines([]); return; }
    try {
      const res = await apiFetch(`/api/recipes?product_id=${pid}`, token);
      if (res.ok) setLines(await res.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
    }
  }

  useEffect(() => { boot(); }, []);
  useEffect(() => { loadLines(productId); }, [productId]);

  const latestCost = useMemo(() => {
    const map = {};
    const sorted = [...purchases].sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));
    for (const pu of sorted) {
      if (map[pu.ingredient_id] == null && pu.cost_per_unit_minor != null) map[pu.ingredient_id] = Number(pu.cost_per_unit_minor);
    }
    return map;
  }, [purchases]);

  const ingName = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, `${i.name} (${i.unit})`])), [ingredients]);
  const ingUnit = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i.unit])), [ingredients]);
  const costPreview = lines.reduce((s, l) => s + Number(l.qty_per_sale) * (latestCost[l.ingredient_id] || 0), 0);
  const selectedProduct = products.find((p) => String(p.id) === String(productId));

  if (!isOwner) return null;
  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={boot}>Retry</Button></Card>;

  async function link(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/recipes', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, ingredient_id: ingId, qty_per_sale: Number(qty) }),
      });
      if (res.ok) { setQty(''); setIngId(''); loadLines(productId); }
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
    }
  }

  async function remove(id) {
    try {
      await apiFetch(`/api/recipes/${id}`, token, { method: 'DELETE' });
    } catch (e) {
      if (e?.code === 401) { sessionExpired?.(); return; }
    }
    loadLines(productId);
  }

  return (
    <div>
      <h2 className="page-title">Recipes</h2>
      <Card>
        <Field label="Product">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Pick a product</option>
            {products.filter((p) => p.is_active !== false).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </Card>
      {!productId ? (
        <EmptyState line="Pick a product to see or edit its ingredients." />
      ) : (
        <>
          <Card>
            {lines.length === 0 && <p className="stat-label">No ingredients — services with no materials keep full price as profit.</p>}
            {lines.map((l) => (
              <ListRow
                key={l.id}
                title={ingName[l.ingredient_id] || l.ingredient_id}
                subtitle={`Qty per sale: ${l.qty_per_sale}`}
                trailing={<Button variant="ghost" onClick={() => remove(l.id)} aria-label={`Remove ${ingName[l.ingredient_id]}`}>Remove</Button>}
              />
            ))}
            <p className="stat-label">Estimated product cost (latest purchases): <Money minor={Math.round(costPreview)} strong />{selectedProduct && <> · sells at <Money minor={selectedProduct.price_minor} /></>}</p>
          </Card>
          <Card>
            <form onSubmit={link}>
              <Field label="Ingredient">
                <select value={ingId} onChange={(e) => setIngId(e.target.value)} required>
                  <option value="">Ingredient</option>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </Field>
              <Field label={ingId && ingUnit[ingId] ? `Qty per sale (${ingUnit[ingId]})` : 'Qty per sale'}><input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" required placeholder="e.g. 2" /></Field>
              <Button type="submit" block>Add ingredient</Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
