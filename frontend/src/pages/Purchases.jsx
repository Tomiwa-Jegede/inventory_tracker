import { useEffect, useMemo, useState } from 'react';
import { Button, Card, ComboSelect, EmptyState, Field, ListRow, Money, Sheet, Skeleton } from '../components/ui.jsx';
import { apiFetch, todayISO } from '../lib/api.js';
import { parseMajorToMinor } from '../lib/money.js';

export default function Purchases({ token, sessionExpired }) {
  const [purchases, setPurchases] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [ingId, setIngId] = useState('');
  const [qty, setQty] = useState('');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState(todayISO());
  const [supplier, setSupplier] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [p, i] = await Promise.all([
        apiFetch('/api/purchases', token),
        apiFetch('/api/ingredients', token),
      ]);
      if (p.ok) setPurchases(await p.json());
      if (i.ok) setIngredients(await i.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load purchases. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const ingMap = useMemo(() => Object.fromEntries(ingredients.map((i) => [i.id, i])), [ingredients]);
  const grouped = useMemo(() => {
    const g = {};
    for (const p of purchases) (g[p.purchase_date] = g[p.purchase_date] || []).push(p);
    return Object.keys(g).sort().reverse().map((d) => ({ date: d, rows: g[d] }));
  }, [purchases]);

  const liveUnit = useMemo(() => {
    const t = parseMajorToMinor(total);
    const q = Number(qty);
    if (t == null || !q || q <= 0) return null;
    return Math.round(t / q);
  }, [total, qty]);

  const selectedIng = ingMap[ingId] || null;
  const lastBuy = useMemo(() => {
    if (!ingId) return null;
    return [...purchases].sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1)).find((p) => String(p.ingredient_id) === String(ingId)) || null;
  }, [purchases, ingId]);

  function chooseItem(id) {
    setIngId(id);
    // Prefill from history (editable): last supplier for this ingredient, last price paid.
    try {
      const sup = localStorage.getItem(`it-sup:${id}`);
      if (sup) setSupplier(sup);
    } catch { /* ignore */ }
    const prev = [...purchases].sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1)).find((p) => String(p.ingredient_id) === String(id));
    if (prev) {
      if (!supplier) setSupplier(prev.supplier || '');
      setTotal(String(Number(prev.total_minor) / 100));
    } else {
      setTotal('');
    }
  }

  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;

  async function save(e) {
    e.preventDefault();
    const total_minor = parseMajorToMinor(total);
    if (total_minor == null) return;
    try {
      const res = await apiFetch('/api/purchases', token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_id: ingId, qty: Number(qty), total_minor, purchase_date: date, supplier: supplier.trim() || undefined }),
      });
      if (!res.ok) return;
      try {
        if (supplier.trim()) localStorage.setItem(`it-sup:${ingId}`, supplier.trim());
      } catch { /* ignore */ }
      setOpen(false); setQty(''); setTotal(''); setSupplier(''); setIngId('');
      load();
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
    }
  }

  return (
    <div>
      <div className="row-between"><strong>Purchases</strong><Button onClick={() => setOpen(true)}>＋ Add purchase</Button></div>
      {grouped.length === 0 ? (
        <EmptyState line="No purchases yet." action={<Button onClick={() => setOpen(true)}>＋ Add purchase</Button>} />
      ) : grouped.map((g) => (
        <Card key={g.date}>
          <strong>{g.date}</strong>
          {g.rows.map((p) => (
            <ListRow
              key={p.id}
              title={`${ingMap[p.ingredient_id]?.name || p.ingredient_id} × ${p.qty}`}
              subtitle={`${p.supplier || 'No supplier'} · cost/unit ${Number(p.cost_per_unit_minor) / 100}`}
              trailing={<Money minor={p.total_minor} />}
            />
          ))}
        </Card>
      ))}
      {open && (
        <Sheet title="Add purchase" onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <Field label="Item">
              <select value={ingId} onChange={(e) => chooseItem(e.target.value)} required aria-label="Ingredient to buy">
                <option value="">Select ingredient</option>
                {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </Field>
            <Field label={selectedIng ? `Quantity (${selectedIng.unit})` : 'Quantity'} help={lastBuy ? `Last paid ${Number(lastBuy.total_minor) / 100} on ${lastBuy.purchase_date}.` : undefined}>
              <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" required aria-label={selectedIng ? `Quantity in ${selectedIng.unit}` : 'Quantity'} />
            </Field>
            <div className="row" aria-label="Quick quantities">
              {[1, 2, 5, 10].map((n) => (
                <button key={n} type="button" className="chip" onClick={() => setQty(String(n))} aria-label={`Quantity ${n}`}>{n}</button>
              ))}
            </div>
            <Field label="Price paid (total)"><input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" required /></Field>
            {liveUnit != null && (
              <p className="stat-label" aria-live="polite">Cost per unit: <Money minor={liveUnit} strong /> (Price ÷ Qty)</p>
            )}
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
            <ComboSelect kind="supplier" label="Supplier" value={supplier} onChange={setSupplier} token={token} sessionExpired={sessionExpired} rememberLast emptyHint="No suppliers yet. Type to add your first." />
            <Button type="submit" block>Save purchase</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
