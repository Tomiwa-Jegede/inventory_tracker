import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field } from '../components/ui.jsx';
import { saveSession, apiFetch } from '../lib/api.js';
import { setBusinessPrefs } from '../lib/money.js';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', null, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      setBusinessPrefs(data.business);
      saveSession(data);
      onLogin(data);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.code === 401) setError('Wrong email or password');
      else setError('Network error. The server may be waking up — wait a moment and retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <h1>Inventory Tracker</h1>
      <Card>
        <form onSubmit={submit}>
          <Field label="Email" error={undefined}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password" error={error || undefined}>
            <div className="row">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button type="button" className="btn btn-secondary" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Button type="submit" block disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </Card>
    </div>
  );
}
