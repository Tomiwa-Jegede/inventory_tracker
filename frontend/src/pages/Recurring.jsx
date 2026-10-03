import { useEffect, useMemo, useState } from 'react';
import { Button, Card, ComboSelect, EmptyState, Field, ListRow, Money, Sheet, Skeleton } from '../components/ui.jsx';
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
  const [preset, setPreset] = useState('3');
  const [customDays, setCustomDays] = useState('');
  const [firstDue, setFirstDue] = useState(todayISO());
  const [ingredientNames, setIngredientNames] = useState([]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [r, i] = await Promise.all([
        apiFetch('/api/recurring', token),
        apiFetch('/api/ingredients', token),
      ]);
      if (r.ok) setRows(await r.json());
      if (i.ok) setIngredientNames((await i.json()).map((x) => x.name));
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
    const interval_days = preset === 'custom' ? Number(customDays) : Number(preset);
    if (!name.trim() || amount_minor == null || !interval_days || interval_days <= 0) return;
    const res = await apiFetch('/api/recurring', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), amount_minor, interval_days, next_due_date: firstDue }),
    });
    if (res.ok) { setName(''); setAmount(''); setOpen(false); setFirstDue(todayISO()); load(); }
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
            <ComboSelect kind="expense_name" label="Name" value={name} onChange={setName} token={token} sessionExpired={sessionExpired} extraOptions={ingredientNames} emptyHint="No expense names yet. Type to add one." />
            <Field label="Amount"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required placeholder="e.g. 5000" /></Field>
            <Field label="Repeats">
              <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Repeat interval">
                <option value="1">Every day</option><option value="2">Every 2 days</option>
                <option value="3">Every 3 days</option><option value="7">Weekly</option>
                <option value="14">Every 2 weeks</option><option value="30">Monthly</option>
                <option value="custom">Custom…</option>
              </select>
            </Field>
            {preset === 'custom' && <Field label="Every N days"><input value={customDays} onChange={(e) => setCustomDays(e.target.value)} inputMode="numeric" required /></Field>}
            <Field label="First due date"><input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} required /></Field>
            <Button type="submit" block>Save</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
