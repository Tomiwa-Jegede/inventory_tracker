import { useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, ListRow, Sheet, Skeleton } from '../components/ui.jsx';
import { apiFetch } from '../lib/api.js';

const KINDS = [
  ['category', 'Categories'],
  ['unit', 'Units'],
  ['supplier', 'Suppliers'],
  ['overhead_name', 'Overhead names'],
  ['expense_name', 'Expense names'],
  ['edit_reason', 'Edit reasons'],
];

export default function Lists({ token, isOwner, sessionExpired }) {
  const [kind, setKind] = useState('category');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [formError, setFormError] = useState('');

  async function load(k = kind) {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/options?kind=${k}&include_archived=1`, token);
      if (!res.ok) throw new Error('load failed');
      setRows((await res.json()).map((o) => ({ ...o, kind: k })));
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load lists. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(kind); }, [kind]);

  if (!isOwner) return <p>Lists are owner-only.</p>;

  async function saveRename(e) {
    e.preventDefault();
    setFormError('');
    try {
      const res = await apiFetch(`/api/options/${editing.id}`, token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue.trim() }),
      });
      if (res.status === 409) { setFormError('Another option already has that value.'); return; }
      if (!res.ok) { setFormError('Rename failed. Retry.'); return; }
      setEditing(null);
      load();
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
      else setFormError('Network error. Retry.');
    }
  }

  async function setArchived(o, archived) {
    try {
      const res = await apiFetch(`/api/options/${o.id}`, token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      });
      if (res.ok) load();
    } catch (err) {
      if (err?.code === 401) sessionExpired?.();
    }
  }

  const live = rows.filter((o) => !o.archived);
  const archived = rows.filter((o) => o.archived);

  return (
    <div>
      <h2 className="page-title">Lists</h2>
      <p className="stat-label">Rename or archive dropdown values. Renames update old records so reports stay grouped. Archived options disappear from pickers but old records keep their text.</p>
      <div className="tabs" role="tablist" aria-label="List kinds">
        {KINDS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>{label}</button>
        ))}
      </div>
      {loading ? <div><Skeleton /><Skeleton /></div>
        : error ? <Card><p role="alert">{error}</p><Button onClick={() => load()}>Retry</Button></Card>
        : live.length === 0 ? <EmptyState line="No values yet — they appear as you save products, purchases and expenses." />
        : (
          <Card>
            {live.map((o) => (
              <ListRow
                key={o.id}
                title={o.value}
                onClick={() => { setEditing(o); setNewValue(o.value); setFormError(''); }}
              />
            ))}
          </Card>
        )}
      {archived.length > 0 && (
        <Card>
          <button className="btn btn-ghost" onClick={() => setShowArchived((s) => !s)} aria-expanded={showArchived}>
            Archived ({archived.length}) {showArchived ? '▾' : '▸'}
          </button>
          {showArchived && archived.map((o) => (
            <ListRow key={o.id} title={o.value} badge={<Badge>archived</Badge>} trailing={<Button variant="secondary" onClick={() => setArchived(o, false)}>Restore</Button>} />
          ))}
        </Card>
      )}
      {editing && (
        <Sheet title="Rename option" onClose={() => setEditing(null)}>
          <form onSubmit={saveRename}>
            <Field label="Value" error={formError || undefined}>
              <input value={newValue} onChange={(e) => setNewValue(e.target.value)} required />
            </Field>
            <Button type="submit" block>Save (updates old records)</Button>
          </form>
          <div className="mt"><Button variant="danger" block onClick={() => { setArchived(editing, true); setEditing(null); }}>Archive instead</Button></div>
        </Sheet>
      )}
    </div>
  );
}
