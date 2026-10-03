import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, EmptyState, Field, Skeleton, Toast } from '../components/ui.jsx';
import { Money } from '../components/ui.jsx';
import { apiFetch, apiUpload, todayISO } from '../lib/api.js';
import { parseMajorToMinor } from '../lib/money.js';

export default function Sell({ token, sessionExpired }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState({});
  const [quickMode, setQuickMode] = useState(false);
  const [quickTotal, setQuickTotal] = useState('');
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [failed, setFailed] = useState(null);
  const toastTimer = useRef(null);

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/products', token);
      if (!res.ok) throw new Error('load failed');
      setProducts(await res.json());
    } catch (e) {
      if (e.code === 401) sessionExpired();
      else setError('Could not load products. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, []);

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category || 'Other'));
    return ['All', ...s];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'All' && (p.category || 'Other') !== cat) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, cat]);

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const count = Object.values(cart).reduce((s, q) => s + q, 0);
  const totalMinor = Object.entries(cart).reduce((s, [id, q]) => s + (byId[id]?.price_minor || 0) * q, 0);

  function inc(id) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function dec(id) {
    setCart((c) => {
      const next = { ...c };
      next[id] = (next[id] || 0) - 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  async function uploadPhotoBestEffort() {
    if (!photo) return null;
    try {
      const form = new FormData();
      form.append('receipt', photo);
      const res = await apiUpload('/api/receipts/upload', token, form);
      if (!res.ok) return null;
      const data = await res.json();
      return data.key || null;
    } catch {
      return null; // never block saving on photo
    }
  }

  async function saveCart(retryCart) {
    const items = retryCart || cart;
    if (Object.keys(items).length === 0) return;
    setSaving(true);
    setFailed(null);
    try {
      const receipt_key = await uploadPhotoBestEffort();
      const failures = {};
      const date = todayISO();
      for (const [product_id, qty] of Object.entries(items)) {
        try {
          const res = await apiFetch('/api/sales', token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id, sale_date: date, qty, ...(receipt_key ? { receipt_key } : {}) }),
          });
          if (!res.ok) failures[product_id] = qty;
        } catch (e) {
          if (e.code === 401) { sessionExpired(); return; }
          failures[product_id] = qty;
        }
      }
      if (Object.keys(failures).length > 0) {
        setFailed(failures); // keep entered data, offer retry
        setToast({ message: 'Some items failed to save. Selection kept — retry.' });
      } else {
        const saved = { ...items };
        setCart({});
        setPhoto(null);
        setToast({
          message: `Sale saved (${Object.keys(saved).length} item${Object.keys(saved).length > 1 ? 's' : ''}). Corrections need owner (see Today).`,
          undo: saved,
        });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 10000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveQuick(e) {
    e?.preventDefault();
    const total_minor = parseMajorToMinor(quickTotal);
    if (total_minor == null) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/sales/day-total', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_date: todayISO(), total_minor }),
      });
      if (!res.ok) throw new Error('save failed');
      const prev = quickTotal;
      setQuickTotal('');
      setToast({ message: 'Daily total saved.', undo: null, undoQuick: prev });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 10000);
    } catch (err) {
      if (err.code === 401) sessionExpired();
      else setToast({ message: 'Save failed. Value kept — retry.' });
    } finally {
      setSaving(false);
    }
  }

  function undoToast() {
    if (toast?.undo) setCart(toast.undo);
    if (toast?.undoQuick) setQuickTotal(toast.undoQuick);
    setToast(null);
  }

  if (loading) return <div><Skeleton /><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={loadProducts}>Retry</Button></Card>;

  return (
    <div>
      <h2 className="page-title">Sell</h2>
      <div className="row">
        <button className="chip" aria-pressed={!quickMode} onClick={() => setQuickMode(false)}>Items</button>
        <button className="chip" aria-pressed={quickMode} onClick={() => setQuickMode(true)}>Enter daily total</button>
      </div>

      {quickMode ? (
        <Card>
          <form onSubmit={saveQuick}>
            <Field label="Daily total (busy days, no breakdown)" help="Use when the item breakdown isn't known.">
              <input placeholder="e.g. 45000" value={quickTotal} onChange={(e) => setQuickTotal(e.target.value)} inputMode="decimal" required />
            </Field>
            <Button type="submit" block disabled={saving || !quickTotal}>{saving ? 'Saving…' : 'Save total only'}</Button>
          </form>
        </Card>
      ) : (
        <>
          <Field label="Search products">
            <input type="search" placeholder="Search 30+ products…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
          </Field>
          {categories.length > 2 && (
            <div className="tabs" role="tablist" aria-label="Categories">
              {categories.map((c) => (
                <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
          )}
          {filtered.length === 0 ? (
            <EmptyState line={products.length === 0 ? 'No products yet — ask owner to add products.' : 'No matches. Try another search.'} />
          ) : (
            <div className="grid-products">
              {filtered.map((p) => {
                const q = cart[p.id] || 0;
                return (
                  <div key={p.id} className="tile" aria-pressed={q > 0}>
                    <button onClick={() => inc(p.id)} aria-label={`Add ${p.name}`} className="tile-main">
                      <span>{p.name}</span>
                      <span className="price"><Money minor={p.price_minor} /></span>
                      {q > 0 && <span aria-live="polite">× {q}</span>}
                    </button>
                    {q > 0 && (
                      <div className="qtyctl">
                        <button className="btn btn-secondary" onClick={() => dec(p.id)} aria-label={`Remove one ${p.name}`}>−</button>
                        <button className="btn btn-secondary" onClick={() => inc(p.id)} aria-label={`Add one more ${p.name}`}>＋</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Card>
            <Field label="Receipt photo (Optional)" help="Backup only. Saving never waits on it.">
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0] || null)} />
            </Field>
          </Card>
          {failed && (
            <Card>
              <p role="alert">Some items failed to save — nothing was lost.</p>
              <Button onClick={() => saveCart(failed)} disabled={saving}>{saving ? 'Retrying…' : 'Retry failed items'}</Button>
            </Card>
          )}
          <div className="totalbar-spacer" />
          <div className="totalbar">
            <span className="grow">{count} item{count === 1 ? '' : 's'} · <Money minor={totalMinor} strong /></span>
            <Button onClick={() => saveCart()} disabled={saving || count === 0}>{saving ? 'Saving…' : 'Save sale'}</Button>
          </div>
        </>
      )}
      {toast && <Toast message={toast.message} actionLabel={toast.undo || toast.undoQuick ? 'Undo' : undefined} onAction={undoToast} onClose={() => setToast(null)} />}
    </div>
  );
}
