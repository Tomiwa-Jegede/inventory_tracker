import { formatMoney } from '../lib/money.js';

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
