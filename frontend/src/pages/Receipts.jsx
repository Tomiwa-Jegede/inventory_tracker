import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, ListRow, Skeleton } from '../components/ui.jsx';
import { Money } from '../components/ui.jsx';
import { apiFetch } from '../lib/api.js';

export default function Receipts({ token, sessionExpired }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/sales', token);
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      const withPhoto = (data.sales || []).filter((s) => s.receipt_photo_url || s.receipt_key);
      withPhoto.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setRows(withPhoto.slice(0, 30));
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load receipts. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (rows.length === 0) return <EmptyState line="No receipt photos yet. Attach one on the Sell screen (optional)." action={<Link className="btn btn-primary" to="/sell">Go to Sell</Link>} />;

  return (
    <Card>
      {rows.map((s) => (
        <Link key={s.id} className="listrow" to={`/stock/ocr/${s.id}`}>
          <span className="grow">
            <span>{s.sale_date} · {s.qty} × {s.product_id}</span><br />
            <span className="sub"><Money minor={s.total_minor} /></span>
            <Badge tone="warn">pending review</Badge>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}
    </Card>
  );
}
