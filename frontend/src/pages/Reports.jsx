import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Field, ListRow, Money, Sheet, Skeleton, StatCard } from '../components/ui.jsx';
import { apiFetch, todayISO } from '../lib/api.js';

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function monthStart(dateStr) {
  return dateStr.slice(0, 8) + '01';
}

function applyPeriod(p, setFrom, setTo) {
  const t = todayISO();
  if (p === 'today') { setFrom(t); setTo(t); }
  else if (p === 'yesterday') { const y = addDays(t, -1); setFrom(y); setTo(y); }
  else if (p === 'week') { setFrom(mondayOf(t)); setTo(t); }
  else if (p === 'lastweek') { setFrom(addDays(mondayOf(t), -7)); setTo(addDays(mondayOf(t), -1)); }
  else if (p === 'month') { setFrom(monthStart(t)); setTo(t); }
  else if (p === 'lastmonth') {
    const first = monthStart(t);
    const last = addDays(first, -1);
    setFrom(monthStart(last)); setTo(last);
  }
}

export default function Reports({ token, isOwner, sessionExpired }) {
  const [tab, setTab] = useState('daily');
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [trends, setTrends] = useState(null);
  const [daily, setDaily] = useState(null);
  const [salesRows, setSalesRows] = useState(null);
  const [products, setProducts] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [actorFilter, setActorFilter] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editReasons, setEditReasons] = useState([]);
  const [period, setPeriod] = useState('today');

  function choosePeriod(p) {
    setPeriod(p);
    if (p !== 'custom') applyPeriod(p, setFrom, setTo);
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const er = await apiFetch('/api/options?kind=edit_reason', token);
      if (er.ok) setEditReasons(await er.json());
      if (tab === 'daily') {
        const [d, s, a, p] = await Promise.all([
          apiFetch(`/api/reports/daily?sale_date=${from}`, token),
          apiFetch(`/api/sales?sale_date=${from}`, token),
          isOwner ? apiFetch('/api/audit', token) : Promise.resolve(null),
          apiFetch('/api/products?include_archived=1', token),
        ]);
        if (d.ok) setDaily(await d.json());
        if (s.ok) setSalesRows(await s.json());
        if (a?.ok) setAuditRows(await a.json());
        if (p.ok) setProducts(await p.json());
      } else if (tab === 'weekly' || tab === 'monthly') {
        const t = await apiFetch(`/api/reports/trends?from=${from}&to=${to}`, token);
        if (t.ok) setTrends(await t.json());
      } else if (tab === 'products') {
        const [p, t] = await Promise.all([
          apiFetch('/api/products?include_archived=1', token),
          apiFetch(`/api/reports/trends?from=${from}&to=${to}`, token),
        ]);
        if (p.ok) setProducts(await p.json());
        if (t.ok) {
          const tr = await t.json();
          setTrends(tr);
          const agg = {};
          for (let d = from; d <= to; d = addDays(d, 1)) {
            const r = await apiFetch(`/api/reports/daily?sale_date=${d}`, token);
            if (!r.ok) continue;
            const c = await r.json();
            for (const b of c.breakdown || []) {
              agg[b.product_id] = agg[b.product_id] || { product_id: b.product_id, qty: 0, total_minor: 0, profit_minor: 0 };
              agg[b.product_id].qty += Number(b.qty);
              agg[b.product_id].total_minor += Number(b.total_minor);
              agg[b.product_id].profit_minor += Number(b.profit_minor || 0);
            }
          }
          setBreakdown(Object.values(agg));
        }
      } else if (tab === 'audit') {
        const a = await apiFetch('/api/audit', token);
        if (a.ok) setAuditRows(await a.json());
      }
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load reports. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  const actors = useMemo(() => [...new Set(auditRows.map((a) => a.actor))], [auditRows]);
  const auditFiltered = auditRows.filter((a) => {
    if (actorFilter && a.actor !== actorFilter) return false;
    if (auditDate && !String(a.created_at).startsWith(auditDate)) return false;
    return true;
  });
  const editedIds = useMemo(() => new Set(auditRows.filter((a) => a.action === 'sale.edit').map((a) => a.target)), [auditRows]);
  const prodName = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);
  const prodSum = breakdown.reduce((s, b) => s + b.profit_minor, 0);
  const maxTrend = Math.max(1, ...((trends?.days || []).map((d) => Math.abs(d.net_minor || 0))));

  async function saveEdit(e) {
    e.preventDefault();
    if (!editReason) return;
    if (editReason === 'Other' && !editNote.trim()) return;
    try {
      const res = await apiFetch(`/api/sales/${editing.id}`, token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: Number(editQty), reason: editReason, ...(editReason === 'Other' ? { note: editNote.trim() } : {}) }),
      });
      if (!res.ok) return;
      setEditing(null);
      load();
      const a = await apiFetch('/api/audit', token);
      if (a.ok) setAuditRows(await a.json());
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
    }
  }

  return (
    <div>
      <h2 className="page-title">Reports</h2>
      <div className="tabs" role="tablist" aria-label="Report tabs">
        {['daily', 'weekly', 'monthly', 'products', 'audit'].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      <Card>
        <Field label="Period">
          <select value={period} onChange={(e) => choosePeriod(e.target.value)} aria-label="Report period">
            <option value="today">Today</option><option value="yesterday">Yesterday</option>
            <option value="week">This week</option><option value="lastweek">Last week</option>
            <option value="month">This month</option><option value="lastmonth">Last month</option>
            <option value="custom">Custom…</option>
          </select>
        </Field>
        {period === 'custom' && (
          <div className="row mt">
            <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        )}
        <Button onClick={load} disabled={loading} block>{loading ? 'Loading…' : 'Load'}</Button>
      </Card>
      {error && <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>}
      {loading && <div><Skeleton /><Skeleton /></div>}

      {(tab === 'weekly' || tab === 'monthly') && trends && (
        <>
          <div className="stat-row">
            <StatCard label="Sales" minor={trends.totals.total_minor} />
            <StatCard label="Net" minor={trends.totals.net_minor} tone={trends.totals.net_minor >= 0 ? 'success' : 'danger'} />
          </div>
          <Card>
            <strong>Profit by day</strong>
            <div className="trend" role="img" aria-label="Profit trend chart">
              {trends.days.map((d) => (
                <div key={d.sale_date} className={`bar${(d.net_minor || 0) < 0 ? ' neg' : ''}`} style={{ height: `${Math.max(4, (Math.abs(d.net_minor || 0) / maxTrend) * 96)}px` }} title={`${d.sale_date}: ${d.status}`} />
              ))}
            </div>
            <div className="table-scroll"><table>
              <thead><tr><th>Date</th><th>Sales</th><th>Net</th><th>Status</th></tr></thead>
              <tbody>{trends.days.map((d) => (
                <tr key={d.sale_date}><td>{d.sale_date}</td><td><Money minor={d.total_minor} /></td><td><Money minor={d.net_minor} /></td><td>{d.status}</td></tr>
              ))}</tbody>
            </table></div>
          </Card>
        </>
      )}

      {tab === 'daily' && daily && (
        <Card>
          <strong>{daily.sale_date} entries</strong>
          {(salesRows?.sales || []).map((s) => (
            <ListRow
              key={s.id}
              title={`${s.qty} × ${prodName[s.product_id] || s.product_id}`}
              subtitle={editedIds.has(s.id) ? 'corrected' : s.created_at}
              badge={editedIds.has(s.id) ? <Badge>edited</Badge> : null}
              trailing={<span><Money minor={s.total_minor} />{isOwner && <Button variant="ghost" onClick={() => { setEditing(s); setEditQty(String(s.qty)); setEditReason(''); setEditNote(''); }}>Edit</Button>}</span>}
            />
          ))}
          {(salesRows?.dayTotals || []).map((t) => (
            <ListRow key={t.id} title="Quick total (no breakdown)" subtitle={t.note || ''} trailing={<Money minor={t.total_minor} />} />
          ))}
        </Card>
      )}

      {tab === 'products' && (
        <Card>
          <strong>Per-product profit</strong>
          <div className="table-scroll"><table>
            <thead><tr><th>Product</th><th>Sold</th><th>Sales</th><th>Profit</th></tr></thead>
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.product_id}><td>{prodName[b.product_id] || b.product_id}</td><td>{b.qty}</td><td><Money minor={b.total_minor} /></td><td><Money minor={b.profit_minor} /></td></tr>
              ))}
              <tr><td><strong>Total</strong></td><td></td><td></td><td><strong><Money minor={prodSum} /></strong></td></tr>
            </tbody>
          </table></div>
          {trends && <p className="stat-label">Trust check: rows sum to <Money minor={prodSum} /> vs gross <Money minor={trends.totals.gross_minor} /> {prodSum === trends.totals.gross_minor ? '✓ match' : '⚠ differs (quick totals carry no product profit)'}.</p>}
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <div className="row">
            <Field label="User"><select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}><option value="">All</option>{actors.map((a) => <option key={a} value={a}>{a}</option>)}</select></Field>
            <Field label="Date"><input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} /></Field>
          </div>
          {auditFiltered.length === 0 ? <p className="stat-label">No audit entries.</p> : auditFiltered.slice(-30).reverse().map((a) => (
            <ListRow
              key={a.id}
              title={`${a.actor} · ${a.action}`}
              subtitle={`${a.created_at} · reason: ${a.reason}${a.note ? ` — ${a.note}` : ''} · before ${JSON.stringify(a.before?.qty ?? a.before?.total_minor ?? '')} → after ${JSON.stringify(a.after?.qty ?? a.after?.total_minor ?? '')}`}
              badge={<Badge>edited</Badge>}
            />
          ))}
        </Card>
      )}

      {editing && (
        <Sheet title="Edit sale" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit}>
            <Field label="Quantity"><input value={editQty} onChange={(e) => setEditQty(e.target.value)} inputMode="numeric" required /></Field>
            <Field label="Reason (required)" help="Logged in audit with before/after.">
              <select value={editReason} onChange={(e) => setEditReason(e.target.value)} required aria-label="Edit reason">
                <option value="">Choose a reason</option>
                {editReasons.map((r) => <option key={r.id} value={r.value}>{r.value}</option>)}
              </select>
            </Field>
            {editReason === 'Other' && (
              <Field label="Note (required for Other)"><input value={editNote} onChange={(e) => setEditNote(e.target.value)} required placeholder="What happened?" /></Field>
            )}
            <Button type="submit" block>Save correction</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
