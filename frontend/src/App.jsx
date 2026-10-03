import { Suspense, lazy, useCallback, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import { Skeleton } from './components/ui.jsx';
import { clearSession, loadSession } from './lib/api.js';
import { setBusinessPrefs } from './lib/money.js';

const Today = lazy(() => import('./pages/Today.jsx'));
const Sell = lazy(() => import('./pages/Sell.jsx'));
const Stock = lazy(() => import('./pages/Stock.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const More = lazy(() => import('./pages/More.jsx'));
const Setup = lazy(() => import('./pages/Setup.jsx'));
const Recipes = lazy(() => import('./pages/Recipes.jsx'));
const Overheads = lazy(() => import('./pages/Overheads.jsx'));
const Recurring = lazy(() => import('./pages/Recurring.jsx'));
const Lists = lazy(() => import('./pages/Lists.jsx'));
const OcrReview = lazy(() => import('./pages/OcrReview.jsx'));

function RequireAuth({ session, children }) {
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireOwner({ session, children }) {
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== 'owner') return <Navigate to="/" replace />;
  return children;
}

function ShellRoutes({ session, onLogout, sessionExpired }) {
  const navigate = useNavigate();
  const logout = () => {
    clearSession();
    onLogout();
    navigate('/login', { replace: true });
  };
  const expired = () => {
    clearSession();
    onLogout();
    navigate('/login', { replace: true });
  };
  if (!session) return <Navigate to="/login" replace />;
  const token = session.token;
  const isOwner = session.user.role === 'owner';

  return (
    <Routes>
      <Route element={<AppShell session={session} onLogout={logout} />}>
        <Route index element={<RequireAuth session={session}><Today token={token} isOwner={isOwner} sessionExpired={expired} /></RequireAuth>} />
        <Route path="sell" element={<RequireAuth session={session}><Sell token={token} sessionExpired={expired} /></RequireAuth>} />
        <Route path="stock" element={<RequireOwner session={session}><Stock token={token} isOwner={isOwner} sessionExpired={sessionExpired} /></RequireOwner>} />
        <Route path="stock/ocr/:id" element={<RequireOwner session={session}><OcrReview token={token} sessionExpired={expired} /></RequireOwner>} />
        <Route path="reports" element={<RequireOwner session={session}><Reports token={token} isOwner={isOwner} sessionExpired={expired} /></RequireOwner>} />
        <Route path="more" element={<RequireAuth session={session}><More session={session} onLogout={logout} /></RequireAuth>} />
        <Route path="more/products" element={<RequireOwner session={session}><Setup token={token} isOwner={isOwner} onAdded={() => {}} sessionExpired={expired} /></RequireOwner>} />
        <Route path="more/recipes" element={<RequireOwner session={session}><Recipes token={token} isOwner={isOwner} sessionExpired={expired} /></RequireOwner>} />
        <Route path="more/overheads" element={<RequireOwner session={session}><Overheads token={token} isOwner={isOwner} onChanged={() => {}} sessionExpired={expired} /></RequireOwner>} />
        <Route path="more/recurring" element={<RequireOwner session={session}><Recurring token={token} sessionExpired={expired} /></RequireOwner>} />
        <Route path="more/lists" element={<RequireOwner session={session}><Lists token={token} isOwner={isOwner} sessionExpired={expired} /></RequireOwner>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const s = loadSession();
    if (s) setBusinessPrefs(s.business);
    return s;
  });

  const handleLogin = useCallback((data) => {
    setBusinessPrefs(data.business);
    setSession(data);
  }, []);

  const handleLogout = useCallback(() => setSession(null), []);
  const handleExpired = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <Suspense fallback={<div className="main"><Skeleton /><Skeleton /></div>}>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/*" element={<ShellRoutes session={session} onLogout={handleLogout} sessionExpired={handleExpired} />} />
      </Routes>
    </Suspense>
  );
}
