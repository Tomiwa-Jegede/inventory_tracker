import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Field, Skeleton } from '../components/ui.jsx';
import { apiFetch, resolveReceiptUrl, todayISO } from '../lib/api.js';

// OCR is suggest-only. Nothing is saved until the human presses Confirm.
export default function OcrReview({ token, sessionExpired }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgUrl, setImgUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          apiFetch('/api/sales', token),
          apiFetch('/api/products?include_archived=1', token),
        ]);
        const all = s.ok ? ((await s.json()).sales || []) : [];
        const found = all.find((x) => String(x.id) === String(id)) || null;
        setSale(found);
        if (p.ok) setProducts(await p.json());
        const ref = found?.receipt_key || found?.receipt_photo_url;
        if (ref) setImgUrl(await resolveReceiptUrl(token, ref).catch(() => null));
        if (found?.receipt_photo_url || found?.receipt_key) {
          const sug = await apiFetch('/api/ocr/suggest', token, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receipt_photo_url: found.receipt_photo_url }),
          });
          if (sug.ok) {
            const data = await sug.json();
            setFields((data.suggestions || []).map((x) => ({ ...x, qty: Number(x.qty) || 1 })));
          }
        }
      } catch (e) {
        if (e?.code === 401) sessionExpired?.();
        else setError('Could not load receipt. Check connection and retry.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={() => navigate('/stock')}>Back to Stock</Button></Card>;
  if (!sale) return <Card><p>No receipt found for this entry.</p><Link className="btn btn-secondary" to="/stock">Back to Stock</Link></Card>;

  function setQty(i, qty) {
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, qty: Math.max(1, Number(qty) || 1) } : x)));
  }
  function setProduct(i, product_id) {
    setFields((f) => f.map((x, idx) => {
      if (idx !== i) return x;
      const p = products.find((pp) => String(pp.id) === String(product_id));
      return { ...x, product_id, name: p ? p.name : x.name };
    }));
  }

  async function confirm() {
    setSaving(true);
    try {
      for (const f of fields) {
        await apiFetch('/api/sales', token, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: f.product_id, sale_date: sale.sale_date || todayISO(), qty: f.qty, receipt_photo_url: sale.receipt_photo_url }),
        });
      }
      setDone(true);
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Card>
        <p>Confirmed and saved ({fields.length} line{fields.length === 1 ? '' : 's'}). If this duplicates the original entry, correct the original via Reports with a reason.</p>
        <div className="row"><Link className="btn btn-secondary" to="/stock">Back to Stock</Link><Link className="btn btn-primary" to="/">View Today</Link></div>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="page-title">Receipt review</h2>
      {imgUrl && <img className="receipt-img" src={imgUrl} alt="Receipt to review" />}
      <Card>
        <strong>Suggested items (editable)</strong>
        {fields.length === 0 && <p className="stat-label">No suggestions — add lines from Sell instead.</p>}
        {fields.map((f, i) => (
          <div key={i} className="mt">
            <Field label={`Item ${i + 1}`}>
              <select value={f.product_id} onChange={(e) => setProduct(i, e.target.value)} aria-label={`Product for item ${i + 1}`}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Qty" error={f.confidence < 0.5 ? 'Low confidence — check against the photo.' : undefined}>
              <input value={f.qty} onChange={(e) => setQty(i, e.target.value)} inputMode="numeric" aria-label={`Quantity for item ${i + 1}`} />
            </Field>
            {f.confidence < 0.5 && <Badge tone="warn">low confidence {f.confidence}</Badge>}
            {f.ambiguous_with?.length > 0 && <p className="stat-label">Same price as: {f.ambiguous_with.join(', ')}</p>}
          </div>
        ))}
      </Card>
      <div className="row">
        <Button variant="secondary" onClick={() => navigate('/stock')}>Discard</Button>
        <Button onClick={confirm} disabled={saving || fields.length === 0}>{saving ? 'Saving…' : 'Confirm and save'}</Button>
      </div>
      <p className="stat-label">Nothing is saved until Confirm. OCR never auto-posts.</p>
    </div>
  );
}
