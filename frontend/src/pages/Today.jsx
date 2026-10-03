import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, ListRow, Skeleton, StatCard, Toast } from '../components/ui.jsx';
import { Money } from '../components/ui.jsx';
import { addDaysISO, apiFetch, dailyToCSV, todayISO } from '../lib/api.js';

function isoDate(d) {
  return d;
}

export default function Today({ token, isOwner, sessionExpired }) {
  const [date, setDate] = useState(todayISO());
  const [daily, setDaily] = useState(null);
  const [salesRows, setSalesRows] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const isStaff = !isOwner;
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);
  // Staff: today + yesterday only. Owner: free navigation.
  const canPrev = isOwner || date !== yesterday;
  const canNext = isOwner ? date <= today : date !== today;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const h = {};
      const [dRes, sRes, aRes] = await Promise.all([
        apiFetch(`/api/reports/daily?sale_date=${date}`, token, { headers: h }),
        apiFetch(`/api/sales?sale_date=${date}`, token),
        isOwner ? apiFetch('/api/alerts', token) : Promise.resolve(null),
      ]);
      if (!dRes.ok) throw new Error('daily failed');
      setDaily(await dRes.json());
      if (sRes?.ok) setSalesRows(await sRes.json());
      if (aRes?.ok) setAlerts(await aRes.json());
      else if (isOwner) setAlerts({ lowStock: [], upcomingOverheads: [], upcomingRecurring: [] });
    } catch (e) {
      if (e.code === 401) sessionExpired();
      else setError('Could not load today. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [date, token, isOwner]);

  useEffect(() => { load(); }, [load]);

  function shift(delta) {
    let next = addDaysISO(date, delta);
    if (isStaff && (next !== today && next !== yesterday)) return;
    setDate(next);
  }

  function exportCSV() {
    if (!daily) return;
    const csv = dailyToCSV(daily, salesRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `daily-${daily.sale_date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (loading) return <div><Skeleton /><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;
  if (!daily) return null;

  const netTone = (daily.net_minor ?? 0) >= 0 ? 'success' : 'danger';
  const entries = [...(salesRows?.sales || [])].reverse();

  return (
    <div>
      <div className="date-nav">
        <Button variant="secondary" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous day">‹</Button>
        <h2 className="title-flex">{isoDate(daily.sale_date)}</h2>
        <Button variant="secondary" onClick={() => shift(1)} disabled={!canNext} aria-label="Next day">›</Button>
      </div>

      {isStaff ? (
        <>
          <StatCard label="Total sales today" minor={daily.total_minor} />
          {entries.length === 0 && !daily.hasQuickTotal ? (
            <EmptyState line="No sales logged today" action={<Link className="btn btn-primary" to="/sell">＋ Log a sale</Link>} />
          ) : (
            <Card>
              {entries.slice(0, 20).map((s) => (
                <ListRow key={s.id} title={`${s.qty} × ${s.product_id}`} subtitle={s.sale_date} trailing={<Money minor={s.total_minor} />} />
              ))}
              {daily.hasQuickTotal && <p className="stat-label">Includes quick total entered during busy hours.</p>}
              {(daily.supersededTotals || []).length > 0 && (
                <p className="stat-label">Quick total replaced by breakdown — one truthful number kept.{' '}
                  {(daily.supersededTotals || []).map((t) => <span key={t.id}>Replaced: <Money minor={t.total_minor} />. </span>)}
                </p>
              )}
            </Card>
          )}
          <div className="sticky-cta"><Link className="btn btn-primary btn-block" to="/sell">＋ Log a sale</Link></div>
        </>
      ) : (
        <>
          <Card>
            <div className="stat-label">Net profit today</div>
            <div className={`stat-hero ${netTone === 'success' ? 'text-success' : 'text-danger'}`}><Money minor={daily.net_minor} strong /></div>
            {(daily.shortfall_minor ?? 0) > 0 && <p className="text-danger">Shortfall: set-aside not covered by <Money minor={daily.shortfall_minor} /></p>}
          </Card>
          <div className="stat-row">
            <StatCard label="Total sales" minor={daily.total_minor} />
            <StatCard label="Gross profit" minor={daily.gross_minor} />
          </div>
          <Card>
            <details open>
              <summary><strong>How we got here</strong></summary>
              <div className="table-scroll"><table>
                <tbody>
                  <tr><td>Sales (items + quick totals)</td><td><Money minor={daily.total_minor} /></td></tr>
                  <tr><td>Minus product costs</td><td><Money minor={daily.materialTotal_minor} /></td></tr>
                  <tr><td><strong>= Gross profit</strong></td><td><strong><Money minor={daily.gross_minor} /></strong></td></tr>
                  {(daily.setAsideLines || []).map((l) => (
                    <tr key={l.overhead_id}><td>− {l.name} set-aside</td><td><Money minor={l.daily_minor} /></td></tr>
                  ))}
                  {(daily.adjustments || []).map((a) => (
                    <tr key={a.id}><td>− {a.reason} ({a.type})</td><td><Money minor={a.amount_minor} /></td></tr>
                  ))}
                  <tr><td><strong>= Net profit</strong></td><td><strong><Money minor={daily.net_minor} /></strong></td></tr>
                </tbody>
              </table></div>
            </details>
          </Card>
          <Card>
            <strong>Set-aside status</strong>
            {(daily.setAsideLines || []).length === 0 && <p className="stat-label">No overheads set up yet.</p>}
            {(daily.setAsideLines || []).map((l) => (
              <div key={l.overhead_id} className="mt-8">
                <div className="row-between"><span>{l.name}</span><Money minor={l.daily_minor} /></div>
                <div className="progress" aria-hidden="true"><div className="full" /></div>
              </div>
            ))}
          </Card>
          {alerts && (
            <Card>
              <strong>Alerts</strong>
              {(alerts.lowStock || []).map((i) => (
                <ListRow key={i.ingredient_id} title={i.name} subtitle={`Low stock: ${i.stock_qty} ${i.unit || ''}`} badge={<Badge tone="warn">low stock</Badge>} />
              ))}
              {(alerts.upcomingOverheads || []).map((o) => (
                <ListRow key={o.overhead_id} title={o.name} subtitle={`Due ${o.next_due_date}`} trailing={<Money minor={o.amount_minor} />} badge={<Badge tone="warn">bill due</Badge>} />
              ))}
              {(alerts.upcomingRecurring || []).slice(0, 3).map((r, idx) => (
                <ListRow key={idx} title={r.name || 'Recurring'} subtitle={`Due ${r.due_date}`} />
              ))}
              {(!alerts.lowStock?.length && !alerts.upcomingOverheads?.length) && <p className="stat-label">All clear.</p>}
            </Card>
          )}
          <div className="row">
            <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
          </div>
          <div className="sticky-cta"><Link className="btn btn-primary btn-block" to="/sell">＋ Log a sale</Link></div>
        </>
      )}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
