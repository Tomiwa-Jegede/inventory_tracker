import { useEffect, useState } from 'react';

export default function Overheads({ token, isOwner, onChanged }) {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  async function load() {
    const res = await fetch('/api/overheads', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => { load(); }, []);

  if (!isOwner) return null;

  async function add(e) {
    e.preventDefault();
    const res = await fetch('/api/overheads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name, amount_minor: Math.round(Number(amount) * 100), frequency,
        next_due_date: new Date().toISOString().slice(0, 10),
      }),
    });
    if (res.ok) { setName(''); setAmount(''); load(); onChanged(); }
  }

  return (
    <section>
      <h2>M3: Overhead set-aside</h2>
      <form onSubmit={add}>
        <input placeholder="Name e.g. Rent" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="custom">custom days</option>
        </select>
        <button type="submit">Add overhead</button>
      </form>
      <ul>
        {rows.map((o) => (
          <li key={o.id}>{o.name}: {(o.daily_minor / 100).toFixed(2)}/day, due {o.next_due_date}</li>
        ))}
      </ul>
    </section>
  );
}
