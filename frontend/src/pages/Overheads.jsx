import { useEffect, useState } from 'react';
import { Button, Card, ComboSelect, EmptyState, Field, ListRow, Money, Sheet, Skeleton } from '../components/ui.jsx';
import { apiFetch, todayISO } from '../lib/api.js';
import { parseMajorToMinor } from '../lib/money.js';

export default function Overheads({ token, isOwner, onChanged, sessionExpired }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // 'add' | row
  const [payFor, setPayFor] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [customDays, setCustomDays] = useState('');
  const [due, setDue] = useState(todayISO());
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [payMode, setPayMode] = useState('full');
  const [formError, setFormError] = useState('');

  function openPay(o) {
    setPayFor(o);
    setPayAmount(String(Number(o.amount_minor) / 100));
    setPayDate(todayISO());
    setPayMode('full');
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/overheads', token);
      if (!res.ok) throw new Error('load failed');
      setRows(await res.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load overheads. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  if (!isOwner) return null;
  if (loading) return <div><Skeleton /><Skeleton /></div>;
  if (error) return <Card><p role="alert">{error}</p><Button onClick={load}>Retry</Button></Card>;

  function openAdd() {
    setName(''); setAmount(''); setFrequency('monthly'); setCustomDays(''); setDue(todayISO()); setFormError('');
    setSheet('add');
  }
  function openEdit(o) {
    setName(o.name); setAmount(String(Number(o.amount_minor) / 100)); setFrequency(o.frequency || 'monthly');
    setCustomDays(o.custom_days ? String(o.custom_days) : ''); setDue(o.next_due_date || todayISO()); setFormError('');
    setSheet(o);
  }

  async function save(e) {
    e.preventDefault();
    const amount_minor = parseMajorToMinor(amount);
    if (!name.trim() || amount_minor == null) { setFormError('Name and amount are required.'); return; }
    const body = { name: name.trim(), amount_minor, frequency, next_due_date: due, ...(frequency === 'custom' ? { custom_days: Number(customDays) || 30 } : {}) };
    try {
      const res = sheet === 'add'
        ? await apiFetch('/api/overheads', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await apiFetch(`/api/overheads/${sheet.id}`, token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, reason: 'correction' }) });
      if (!res.ok) { setFormError('Save failed. Values kept — retry.'); return; }
      setSheet(null);
      load();
      if (onChanged) onChanged();
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
      else setFormError('Network error. Values kept — retry.');
    }
  }

  async function recordPayment(e) {
    e.preventDefault();
    const amount_minor = payMode === 'full' ? payFor.amount_minor : parseMajorToMinor(payAmount);
    if (amount_minor == null) return;
    try {
      const res = await apiFetch(`/api/overheads/${payFor.id}/payments`, token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_minor, paid_date: payDate }),
      });
      if (res.ok) { setPayFor(null); setPayAmount(''); load(); }
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
    }
  }

  return (
    <div>
      <div className="row-between"><h2 className="page-title">Overheads</h2><Button onClick={openAdd}>＋ Add</Button></div>
      {rows.length === 0 ? (
        <EmptyState line="No overheads yet — add rent, power, salaries." action={<Button onClick={openAdd}>＋ Add overhead</Button>} />
      ) : (
        <Card>
          {rows.map((o) => (
            <ListRow
              key={o.id}
              title={o.name}
              subtitle={`${o.frequency}${o.frequency === 'custom' ? ` every ${o.custom_days}d` : ''} · due ${o.next_due_date} · paid ${Number(o.paid_minor || 0) / 100}`}
              trailing={<span><Money minor={o.daily_minor} />/day <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openPay(o); }}>Pay</Button></span>}
              onClick={() => openEdit(o)}
            />
          ))}
        </Card>
      )}
      {sheet && (
        <Sheet title={sheet === 'add' ? 'Add overhead' : `Edit ${sheet.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={save}>
            <ComboSelect kind="overhead_name" label="Name" value={name} onChange={setName} token={token} sessionExpired={sessionExpired} emptyHint="No overhead names yet. Type to add one." />
            <Field label="Amount per cycle"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required /></Field>
            <Field label="Cycle">
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="daily">daily</option><option value="weekly">weekly</option>
                <option value="monthly">monthly</option><option value="custom">custom days</option>
              </select>
            </Field>
            {frequency === 'custom' && <Field label="Custom days"><input value={customDays} onChange={(e) => setCustomDays(e.target.value)} inputMode="numeric" /></Field>}
            <Field label="Next due date"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} required /></Field>
            {formError && <p role="alert" className="text-danger">{formError}</p>}
            <Button type="submit" block>Save</Button>
          </form>
        </Sheet>
      )}
      {payFor && (
        <Sheet title={`Payment`} onClose={() => setPayFor(null)}>
          <form onSubmit={recordPayment}>
            <Field label="Overhead">
              <select value={payFor.id} onChange={(e) => openPay(rows.find((r) => String(r.id) === e.target.value))} aria-label="Overhead to pay">
                {rows.map((r) => <option key={r.id} value={r.id}>{r.name} — due {r.next_due_date}</option>)}
              </select>
            </Field>
            <div className="tabs" role="tablist" aria-label="Payment amount">
              <button type="button" role="tab" aria-selected={payMode === 'full'} onClick={() => { setPayMode('full'); setPayAmount(String(Number(payFor.amount_minor) / 100)); }}>Pay full amount</button>
              <button type="button" role="tab" aria-selected={payMode === 'other'} onClick={() => setPayMode('other')}>Other amount</button>
            </div>
            {payMode === 'other' && <Field label="Amount paid"><input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" required /></Field>}
            <Field label="Date"><input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required /></Field>
            <Button type="submit" block>Save payment</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
