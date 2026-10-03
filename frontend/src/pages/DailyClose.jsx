export default function DailyClose({ daily }) {
  if (!daily) return <p>Loading today…</p>;
  return (
    <section>
      <h2>Daily close — {daily.sale_date}</h2>
      <p>Total sales: {(daily.total_minor / 100).toFixed(2)}</p>
      {daily.materialTotal_minor != null && <p>Material cost: {(daily.materialTotal_minor / 100).toFixed(2)}</p>}
      {daily.gross_minor != null && <p>Gross profit: {(daily.gross_minor / 100).toFixed(2)}</p>}
      {daily.setAside_minor != null && <p>Overhead set-aside: {(daily.setAside_minor / 100).toFixed(2)}</p>}
      {daily.net_minor != null && <p><strong>Net profit: {(daily.net_minor / 100).toFixed(2)}</strong></p>}
      <ul>
        {daily.breakdown.map((b) => (
          <li key={b.product_id}>{b.product_id}: {b.qty} sold — {(b.total_minor / 100).toFixed(2)}{b.profit_minor != null ? `, profit ${(b.profit_minor / 100).toFixed(2)}` : ''}</li>
        ))}
      </ul>
      {daily.hasQuickTotal && <p>Includes quick total entered during busy hours.</p>}
      {daily.shortfall_minor > 0 && <p style={{ color: 'red' }}>Shortfall: set-aside not covered by {(daily.shortfall_minor / 100).toFixed(2)}</p>}
    </section>
  );
}
