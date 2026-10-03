import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, ListRow, Money, Sheet, Skeleton } from '../components/ui.jsx';
import { apiFetch, todayISO } from '../lib/api.js';
import { parseMajorToMinor } from '../lib/money.js';

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(n));
  return d.toISOString().slice(0, 10);
}

function nextThree(rule) {
  const out = [];
  let d = rule.next_due_date;
  const today = todayISO();
  while (d < today) d = addDays(d, rule.interval_days);
  for (let i = 0; i < 3; i++) { out.push(d); d = addDays(d, rule.interval_days); }
  return out;
}

export default function Recurring({ token, sessionExpired }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [intervalDays, setIntervalDays] = useState('3');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/recurring', token);
      if (!res.ok) throw new Error('load failed');
      setRows(await res.json());
    } catch (e) {
      if (e?.code === 401 && sessionExpired) sessionExpired();
      else setError('Could not load recurring expenses. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const withDates = useMemo(() => rows.map((r) => ({ ...r, dates: nextThree(r) })), [rows]);

  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;

  async function add(e) {
    e.preventDefault();
    const amount_minor = parseMajorToMinor(amount);
    if (!name.trim() || amount_minor == null) return;
    const res = await apiFetch('/api/recurring', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), amount_minor, interval_days: Number(intervalDays), next_due_date: todayISO() }),
    });
    if (res.ok) { setName(''); setAmount(''); setOpen(false); load(); }
  }

  return (
    <div>
      <div className="row-between"><h2 className="page-title">Recurring expenses</h2><Button onClick={() => setOpen(true)}>＋ Add</Button></div>
      {withDates.length === 0 ? (
        <EmptyState line="No repeats yet — e.g. charcoal every 3 days." action={<Button onClick={() => setOpen(true)}>＋ Add recurring</Button>} />
      ) : (
        <Card>
          {withDates.map((r) => (
            <ListRow key={r.id} title={r.name} subtitle={`Every ${r.interval_days} days · next: ${r.dates.join(', ')}`} trailing={<Money minor={r.amount_minor} />} />
          ))}
        </Card>
      )}
      {open && (
        <Sheet title="Add recurring" onClose={() => setOpen(false)}>
          <form onSubmit={add}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Charcoal" /></Field>
            <Field label="Amount"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required placeholder="e.g. 5000" /></Field>
            <Field label="Every N days"><input value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} inputMode="numeric" required /></Field>
            <Button type="submit" block>Save</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
