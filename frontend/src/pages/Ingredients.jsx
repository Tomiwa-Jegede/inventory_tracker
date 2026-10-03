import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, ComboSelect, EmptyState, Field, ListRow, Sheet, Skeleton } from '../components/ui.jsx';
import { apiFetch } from '../lib/api.js';

export default function Ingredients({ token, sessionExpired }) {
  const [rows, setRows] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('spoilage');
  const [adjDir, setAdjDir] = useState('remove');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [s, p, a] = await Promise.all([
        apiFetch('/api/reports/stock', token),
        apiFetch('/api/purchases', token),
        apiFetch('/api/audit', token),
      ]);
      if (s.ok) setRows(await s.json());
      if (p.ok) setPurchases(await p.json());
      if (a.ok) setAudit(await a.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load ingredients. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const history = useMemo(() => {
    if (!detail) return { buys: [], adjs: [] };
    return {
      buys: purchases.filter((p) => String(p.ingredient_id) === String(detail.id)).slice(0, 10),
      adjs: audit.filter((x) => x.action === 'stock.adjust' && String(x.target) === String(detail.id)).slice(-10).reverse(),
    };
  }, [detail, purchases, audit]);

  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;

  async function add(e) {
    e.preventDefault();
    const res = await apiFetch('/api/ingredients', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), unit: unit.trim() || 'piece' }),
    });
    if (res.ok) { setName(''); setUnit(''); setOpenAdd(false); load(); }
  }

  async function adjust(e) {
    e.preventDefault();
    const amount = Math.abs(Number(adjQty));
    if (!amount) return;
    const res = await apiFetch(`/api/ingredients/${detail.id}/adjust`, token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty_change: adjDir === 'remove' ? -amount : amount, reason: adjReason }),
    });
    if (res.ok) { setAdjQty(''); load(); const r = await apiFetch('/api/reports/stock', token); if (r.ok) { const all = await r.json(); setDetail(all.find((x) => String(x.id) === String(detail.id)) || null); } }
  }

  return (
    <div>
      <div className="row-between"><strong>Ingredients</strong><Button onClick={() => setOpenAdd(true)}>＋ Add</Button></div>
      {rows.length === 0 ? (
        <EmptyState line="No ingredients yet." action={<Button onClick={() => setOpenAdd(true)}>＋ Add ingredient</Button>} />
      ) : (
        <Card>
          {rows.map((i) => (
            <ListRow
              key={i.id}
              title={i.name}
              subtitle={`Left: ${i.stock_qty} ${i.unit}`}
              badge={i.low ? <Badge tone="warn">low stock</Badge> : null}
              onClick={() => setDetail(i)}
            />
          ))}
        </Card>
      )}
      {openAdd && (
        <Sheet title="Add ingredient" onClose={() => setOpenAdd(false)}>
          <form onSubmit={add}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Bun" /></Field>
            <ComboSelect kind="unit" label="Unit" value={unit} onChange={setUnit} token={token} sessionExpired={sessionExpired} emptyHint="No units yet. Type to add one." />
            <Button type="submit" block>Save</Button>
          </form>
        </Sheet>
      )}
      {detail && (
        <Sheet title={detail.name} onClose={() => setDetail(null)}>
          <p className="stat-label">Stock left: {detail.stock_qty} {detail.unit}</p>
          <strong>Purchase history</strong>
          {history.buys.length === 0 ? <p className="stat-label">No purchases.</p> : history.buys.map((p) => (
            <ListRow key={p.id} title={`${p.purchase_date} × ${p.qty}`} subtitle={p.supplier || ''} />
          ))}
          <strong>Adjustments</strong>
          {history.adjs.length === 0 ? <p className="stat-label">No adjustments.</p> : history.adjs.map((a) => (
            <ListRow key={a.id} title={`${a.after?.qty_change ?? ''} (${a.reason})`} subtitle={a.created_at} badge={<Badge>edited</Badge>} />
          ))}
          <form onSubmit={adjust} className="mt">
            <div className="tabs" role="tablist" aria-label="Adjustment direction">
              <button type="button" role="tab" aria-selected={adjDir === 'remove'} onClick={() => setAdjDir('remove')}>Remove stock</button>
              <button type="button" role="tab" aria-selected={adjDir === 'add'} onClick={() => setAdjDir('add')}>Add stock</button>
            </div>
            <Field label={`Quantity (${detail.unit})`} help="Positive number — the app applies the sign. Reason required, logged with history.">
              <input value={adjQty} onChange={(e) => setAdjQty(e.target.value)} inputMode="decimal" required aria-label={`Quantity in ${detail.unit}`} />
            </Field>
            <Field label="Reason">
              <select value={adjReason} onChange={(e) => setAdjReason(e.target.value)}>
                <option value="spoilage">Spoilage</option><option value="waste">Waste</option><option value="correction">Count correction</option><option value="other">Other</option>
              </select>
            </Field>
            <Button type="submit" block>Save adjustment</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
