import { useState } from 'react';
import Ingredients from './Ingredients.jsx';
import Purchases from './Purchases.jsx';
import Receipts from './Receipts.jsx';

export default function Stock({ token, isOwner, sessionExpired }) {
  const [tab, setTab] = useState('purchases');
  return (
    <div>
      <h2 className="page-title">Stock</h2>
      <div className="tabs" role="tablist" aria-label="Stock tabs">
        {['purchases', 'ingredients', 'receipts'].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'purchases' && <Purchases token={token} sessionExpired={sessionExpired} />}
      {tab === 'ingredients' && <Ingredients token={token} sessionExpired={sessionExpired} />}
      {tab === 'receipts' && <Receipts token={token} sessionExpired={sessionExpired} />}
    </div>
  );
}
