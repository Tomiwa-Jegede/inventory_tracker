import { useCallback, useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import Sales from './pages/Sales.jsx';
import DailyClose from './pages/DailyClose.jsx';
import Costs from './pages/Costs.jsx';
import Recipes from './pages/Recipes.jsx';
import Overheads from './pages/Overheads.jsx';
import Reports from './pages/Reports.jsx';
import OcrReview from './pages/OcrReview.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [daily, setDaily] = useState(null);

  const load = useCallback(async (token) => {
    const h = { Authorization: `Bearer ${token}` };
    const [pRes, dRes] = await Promise.all([
      fetch('/api/products', { headers: h }),
      fetch(`/api/reports/daily?sale_date=${new Date().toISOString().slice(0, 10)}`, { headers: h }),
    ]);
    if (pRes.ok) setProducts(await pRes.json());
    if (dRes.ok) setDaily(await dRes.json());
  }, []);

  useEffect(() => {
    if (session) load(session.token);
  }, [session, load]);

  if (!session) {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '0 auto', padding: 16 }}>
        <h1>Inventory Tracker</h1>
        <Login onLogin={setSession} />
      </div>
    );
  }

  const isOwner = session.user.role === 'owner';

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <h1>Inventory Tracker</h1>
      <p>Logged in as {session.user.email} ({session.user.role})</p>
      <Setup token={session.token} isOwner={isOwner} onAdded={(p) => setProducts((prev) => [...prev, p])} />
      <Costs token={session.token} isOwner={isOwner} />
      <Recipes token={session.token} isOwner={isOwner} products={products} />
      <Overheads token={session.token} isOwner={isOwner} onChanged={() => load(session.token)} />
      <Reports token={session.token} isOwner={isOwner} />
      <OcrReview token={session.token} />
      <Sales token={session.token} products={products} onSold={() => load(session.token)} />
      <DailyClose daily={daily} />
    </div>
  );
}
