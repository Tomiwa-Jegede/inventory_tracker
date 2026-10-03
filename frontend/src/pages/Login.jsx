import { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('owner@demo.test');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...(password ? { password } : {}) }),
    });
    const data = await res.json();
    if (res.ok) onLogin(data);
    else setError(data.error || 'login failed');
  }

  return (
    <section>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <select value={email} onChange={(e) => setEmail(e.target.value)}>
          <option value="owner@demo.test">owner@demo.test (owner)</option>
          <option value="staff@demo.test">staff@demo.test (staff)</option>
          <option value="owner2@demo.test">owner2@demo.test (second shop)</option>
        </select>
        <input type="password" placeholder="Password (blank for demo accounts)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Log in</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </section>
  );
}
