import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';
import { findUserByEmail, findUserById, findBusinessById, createUser } from './db/repo.js';
import { publicUser } from './store.js';

export function signJwt(user) {
  return jwt.sign(
    { id: user.id, role: user.role, business_id: user.business_id },
    config.authSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

async function sessionFor(user) {
  const business = await findBusinessById(user.business_id);
  return {
    token: signJwt(user),
    user: publicUser(user),
    business: business
      ? { id: business.id, name: business.name, currency: business.currency, timezone: business.timezone }
      : null,
  };
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'login required' });
  let p;
  try {
    p = jwt.verify(token, config.authSecret);
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
  const user = await findUserById(p.id);
  if (!user || user.role !== p.role) return res.status(401).json({ error: 'invalid token' });
  req.user = { ...user, business_id: p.business_id || user.business_id };
  return next();
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'owner only' });
  next();
}

export async function loginHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(401).json({ error: 'email and password required' });
  const user = await findUserByEmail(email);
  // Same response for unknown email vs wrong password: no account enumeration.
  // (Timing differs slightly; acceptable for this threat model.)
  if (!user || !user.password_hash) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  return res.json(await sessionFor(user));
}

export async function meHandler(req, res) {
  const business = await findBusinessById(req.user.business_id);
  res.json({
    user: publicUser(req.user),
    business: business
      ? { id: business.id, name: business.name, currency: business.currency, timezone: business.timezone }
      : null,
  });
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
  res.status(201).json(await sessionFor(user));
}
