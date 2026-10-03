import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, findUserById, createUser } from './db/repo.js';
import { parseToken, publicUser } from './store.js';

const SECRET = process.env.AUTH_SECRET || 'dev-only-secret-change-in-prod';
const JWT_DAYS = 7;

export function signJwt(user) {
  return jwt.sign({ id: user.id, role: user.role, business_id: user.business_id }, SECRET, { expiresIn: `${JWT_DAYS}d` });
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'login required' });
  try {
    const p = jwt.verify(token, SECRET);
    const user = await findUserById(p.id);
    if (!user || user.role !== p.role) return res.status(401).json({ error: 'invalid token' });
    req.user = { ...user, business_id: p.business_id || user.business_id };
    return next();
  } catch {
    const user = parseToken(token);
    if (!user) return res.status(401).json({ error: 'invalid token' });
    req.user = user;
    return next();
  }
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'owner only' });
  next();
}

export async function loginHandler(req, res) {
  const { email, password } = req.body || {};
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'unknown email' });
  if (user.password_hash) {
    if (!password) return res.status(401).json({ error: 'password required' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'wrong password' });
    return res.json({ token: signJwt(user), user: publicUser(user) });
  }
  const { makeToken } = await import('./store.js');
  res.json({ token: makeToken(user), user: publicUser(user), demo: true });
}

export async function registerHandler(req, res) {
  const { name, email, password, role = 'staff' } = req.body || {};
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'owner only' });
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'name, email, password (8+ chars) required' });
  }
  if (!['owner', 'staff'].includes(role)) return res.status(400).json({ error: 'bad role' });
  if (await findUserByEmail(email)) return res.status(409).json({ error: 'email taken' });
  const password_hash = await bcrypt.hash(password, 10);
  const user = await createUser({ business_id: req.user.business_id, name, email, role, password_hash });
  res.status(201).json({ token: signJwt(user), user: publicUser(user) });
}
