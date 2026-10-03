import { useEffect, useState } from 'react';
import { Badge, Button, Card, ComboSelect, EmptyState, Field, ListRow, Money, Sheet, Skeleton } from '../components/ui.jsx';
import { apiFetch } from '../lib/api.js';
import { parseMajorToMinor } from '../lib/money.js';

export default function Setup({ token, isOwner, onAdded, sessionExpired }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(null); // 'add' | product object
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/products?include_archived=1', token);
      if (!res.ok) throw new Error('load failed');
      setRows(await res.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load products. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (!isOwner) return <p>Setup is owner-only. Staff can enter sales below.</p>;
  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;

  const q = search.trim().toLowerCase();
  const visible = rows.filter((p) => {
    if (filter === 'active' && p.is_active === false) return false;
    if (filter === 'archived' && p.is_active !== false) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });

  function openAdd() {
    setName(''); setCategory(''); setPrice(''); setFormError('');
    setSheet('add');
  }
  function openEdit(p) {
    setName(p.name); setCategory(p.category || ''); setPrice(String(Number(p.price_minor) / 100)); setFormError('');
    setSheet(p);
  }

  async function save(e) {
    e.preventDefault();
    setFormError('');
    const price_minor = parseMajorToMinor(price);
    if (!name.trim() || price_minor == null) { setFormError('Name and price are required.'); return; }
    const body = { name: name.trim(), category: category.trim() || 'General', price_minor };
    try {
      const res = sheet === 'add'
        ? await apiFetch('/api/products', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await apiFetch(`/api/products/${sheet.id}`, token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { setFormError('Save failed. Values kept — retry.'); return; }
      const saved = await res.json();
      if (sheet === 'add' && onAdded) onAdded(saved);
      setSheet(null);
      load();
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
      else setFormError('Network error. Values kept — retry.');
    }
  }

  async function setActive(p, is_active) {
    try {
      await apiFetch(`/api/products/${p.id}`, token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active }),
      });
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
    }
    load();
  }

  return (
    <div>
      <div className="row-between"><h2 className="page-title">Products</h2><Button onClick={openAdd}>＋ Add product</Button></div>
      <Field label="Search products"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" aria-label="Search products" /></Field>
      <div className="tabs" role="tablist" aria-label="Product status">
        {['active', 'archived', 'all'].map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState line={rows.length === 0 ? 'No products yet — add your first one.' : 'Nothing under this filter.'} action={<Button onClick={openAdd}>＋ Add product</Button>} />
      ) : (
        <Card>
          {visible.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              subtitle={`${p.category || 'General'}`}
              badge={p.is_active === false ? <Badge>archived</Badge> : null}
              trailing={<Money minor={p.price_minor} />}
              onClick={() => openEdit(p)}
            />
          ))}
        </Card>
      )}
      <p className="stat-label">Price changes apply to new sales only — past sales keep the price at sale time.</p>
      {sheet && (
        <Sheet title={sheet === 'add' ? 'Add product' : `Edit ${sheet.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={save}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Burger" /></Field>
            <ComboSelect kind="category" label="Category" value={category} onChange={setCategory} token={token} sessionExpired={sessionExpired} rememberLast emptyHint="No categories yet. Type to add your first." />
            <Field label="Price" error={formError || undefined}><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" required placeholder="e.g. 2500" /></Field>
            <Button type="submit" block>Save</Button>
          </form>
          {sheet !== 'add' && (
            <div className="mt">
              {sheet.is_active === false
                ? <Button variant="secondary" block onClick={() => { setActive(sheet, true); setSheet(null); }}>Restore product</Button>
                : <Button variant="danger" block onClick={() => { setActive(sheet, false); setSheet(null); }}>Archive (keeps past sales)</Button>}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
