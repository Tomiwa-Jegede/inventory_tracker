import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMoney } from '../lib/money.js';
import { apiFetch } from '../lib/api.js';

export function Button({ variant = 'primary', block, ...props }) {
  return <button className={`btn btn-${variant}${block ? ' btn-block' : ''}`} {...props} />;
}

export function Field({ label, help, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {help && !error && <div className="help">{help}</div>}
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
}

export function Money({ minor, strong }) {
  const v = formatMoney(minor);
  return strong ? <strong>{v}</strong> : <span>{v}</span>;
}

export function Card({ children }) {
  return <section className="card">{children}</section>;
}

export function StatCard({ label, minor, tone, sub }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ? `text-${tone}` : ''}`}><Money minor={minor} /></div>
      {sub && <div className="stat-label">{sub}</div>}
    </div>
  );
}

export function ListRow({ title, subtitle, trailing, onClick, badge }) {
  const inner = (
    <>
      <span className="grow"><span>{title}</span>{subtitle && <><br /><span className="sub">{subtitle}</span></>}{badge}</span>
      {trailing && <span>{trailing}</span>}
      {onClick && <span aria-hidden="true">›</span>}
    </>
  );
  if (onClick) return <button className="listrow" onClick={onClick}>{inner}</button>;
  return <div className="listrow">{inner}</div>;
}

export function Badge({ tone = 'neutral', children }) {
  const cls = tone === 'neutral' ? 'badge badge-neutral' : tone === 'warn' ? 'badge badge-warn' : 'badge badge-danger';
  return <span className={cls}> {children}</span>;
}

export function EmptyState({ line, action }) {
  return <div className="card"><p>{line}</p>{action}</div>;
}

export function Skeleton() {
  return <div className="skeleton" aria-label="Loading" />;
}

export function Toast({ message, actionLabel, onAction, onClose }) {
  return (
    <div className="toast" role="status">
      <span className="grow">{message}</span>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
      <button onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

export function Sheet({ title, onClose, children }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row-between"><strong>{title}</strong><Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button></div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ line, onCancel, onConfirm, confirmLabel = 'Confirm' }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="alertdialog" aria-label={line} onClick={(e) => e.stopPropagation()}>
        <p>{line}</p>
        <div className="row"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button></div>
      </div>
    </div>
  );
}

function norm(s) {
  return String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
}

// Pick-from-list with inline add ("don't type" fields). Server owns the list
// (GET/POST /api/options); MRU order comes from the server. New values save
// immediately on tap — no extra screen. Staff get allowAdd=false (server 403s).
export function ComboSelect({ kind, value, onChange, token, sessionExpired, label, required, allowAdd = true, extraOptions = [], rememberLast = false, emptyHint, placeholder }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const remembered = useRef(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/options?kind=${kind}`, token);
      if (!res.ok) throw new Error('load failed');
      setOptions(await res.json());
    } catch (e) {
      if (e?.code === 401) sessionExpired?.();
      else setError('Could not load options. Check connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  function show() {
    setQ('');
    setOpen(true);
    load();
  }

  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open ]);

  // Pre-select the last choice for this field on this device (supplier, category).
  useEffect(() => {
    if (!rememberLast || remembered.current || value || !options.length) return;
    try {
      const last = localStorage.getItem(`it-opt-last:${kind}`);
      if (last && options.some((o) => o.value === last)) {
        remembered.current = true;
        onChange(last);
      }
    } catch { /* private mode: skip */ }
  }, [options, rememberLast, value, kind, onChange]);

  const merged = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of options) {
      const k = o.value.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(o.value); }
    }
    for (const x of extraOptions) {
      const v = norm(x);
      if (v && !seen.has(v.toLowerCase())) { seen.add(v); out.push(v); }
    }
    return out;
  }, [options, extraOptions]);

  const query = norm(q);
  const filtered = query ? merged.filter((v) => v.toLowerCase().includes(query.toLowerCase())) : merged;
  const exactMatch = query && merged.some((v) => v.toLowerCase() === query.toLowerCase());
  const canAdd = allowAdd && query && !exactMatch && !saving;

  function pick(v) {
    try {
      if (rememberLast) localStorage.setItem(`it-opt-last:${kind}`, v);
    } catch { /* ignore */ }
    onChange(v);
    setOpen(false);
  }

  async function addNew() {
    if (!canAdd) return;
    // Extra (unsaved) value or brand-new: persist via the options API.
    if (!merged.some((v) => v.toLowerCase() === query.toLowerCase())) {
      setSaving(true);
      try {
        const res = await apiFetch('/api/options', token, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, value: query }),
        });
        if (res.status === 403) { setError('Only owners can add new options.'); return; }
        if (!res.ok) { setError('Could not save. Retry.'); return; }
        const saved = await res.json();
        setOptions((prev) => [{ ...saved }, ...prev.filter((o) => o.value.toLowerCase() !== saved.value.toLowerCase())]);
        pick(saved.value);
        return;
      } catch (e) {
        if (e?.code === 401) { sessionExpired?.(); return; }
        setError('Network error. Retry.');
        return;
      } finally {
        setSaving(false);
      }
    }
    pick(merged.find((v) => v.toLowerCase() === query.toLowerCase()));
  }

  return (
    <div className="field">
      {label && <label>{label}{required ? ' *' : ''}</label>}
      <button type="button" className="btn btn-secondary btn-block combo-trigger" onClick={show} aria-haspopup="dialog">
        <span className="grow">{value || placeholder || `Choose ${label || kind}`}</span><span aria-hidden="true">›</span>
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-label={label || kind} onClick={(e) => e.stopPropagation()}>
            <div className="row-between"><strong>{label || kind}</strong><Button variant="ghost" onClick={() => setOpen(false)} aria-label="Close">✕</Button></div>
            <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label={`Search ${label || kind}`} />
            <p className="stat-label" aria-live="polite">{loading ? 'Loading…' : `${filtered.length} option${filtered.length === 1 ? '' : 's'}`}</p>
            {loading && <div><Skeleton /><Skeleton /></div>}
            {error && <div><p role="alert">{error}</p><Button variant="secondary" onClick={load}>Retry</Button></div>}
            {!loading && !error && filtered.length === 0 && !canAdd && (
              <p className="stat-label">{emptyHint || 'No options yet.'}{allowAdd ? ' Type to add one.' : ''}</p>
            )}
            {!loading && !error && filtered.map((v) => (
              <button key={v} type="button" className="listrow" onClick={() => pick(v)}>
                <span className="grow">{v}{v === value ? ' ✓' : ''}</span>
              </button>
            ))}
            {canAdd && (
              <button type="button" className="listrow" onClick={addNew} disabled={saving}>
                <span className="grow"><strong>＋ Add “{query}”</strong></span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
