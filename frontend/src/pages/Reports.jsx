import { useState } from 'react';

export default function Reports({ token, isOwner }) {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [trends, setTrends] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [auditRows, setAuditRows] = useState([]);

  async function load() {
    const h = { Authorization: `Bearer ${token}` };
    const t = await fetch(`/api/reports/trends?from=${from}&to=${to}`, { headers: h });
    if (t.ok) setTrends(await t.json());
    const u = await fetch('/api/recurring/upcoming?from=2026-01-01&count=5', { headers: h });
    if (u.ok) setUpcoming(await u.json());
    if (isOwner) {
      const a = await fetch('/api/audit', { headers: h });
      if (a.ok) setAuditRows(await a.json());
    }
  }

  return (
    <section>
      <h2>M4: Reports + upcoming + audit</h2>
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <button onClick={load}>Load reports</button>
      {trends && (
        <div>
          <p>Totals: sales {(trends.totals.total_minor / 100).toFixed(2)}, net {(trends.totals.net_minor / 100).toFixed(2)}</p>
          <ul>
            {trends.days.map((d) => (
              <li key={d.sale_date} style={d.status === 'missing' ? { color: '#999' } : {}}>
                {d.sale_date}: {d.status === 'missing' ? 'missing (not zero)' : `${(d.total_minor / 100).toFixed(2)} / net ${(d.net_minor / 100).toFixed(2)}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {upcoming.length > 0 && (
        <ul>
          {upcoming.slice(0, 5).map((o, i) => <li key={i}>{o.name} due {o.due_date}: {(o.amount_minor / 100).toFixed(2)}</li>)}
        </ul>
      )}
      {isOwner && auditRows.length > 0 && (
        <details>
          <summary>Audit ({auditRows.length})</summary>
          <ul>
            {auditRows.slice(-10).map((a) => <li key={a.id}>{a.created_at} {a.actor} {a.action} — {a.reason}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
