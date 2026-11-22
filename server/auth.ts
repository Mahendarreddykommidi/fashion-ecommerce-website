import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb, mutateDb, type StoredUser } from './db.ts';
import type { UserProfile } from '../src/types/ecommerce.ts';

export interface AuthRequest extends Request {
  authUser?: StoredUser;
  authToken?: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function sanitizeUser(user: StoredUser): UserProfile {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    email_verified: user.email_verified,
    created_at: user.created_at,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await mutateDb((db) => {
    const now = Date.now();
    db.sessions = db.sessions.filter((s) => new Date(s.expires_at).getTime() > now);
    db.sessions.push({ token, user_id: userId, expires_at: expiresAt });
  });
  return token;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return null;
}

export function resolveSessionUser(req: Request): { user: StoredUser; token: string } | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const db = getDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }
  const user = db.users.find((u) => u.id === session.user_id);
  if (!user) return null;
  return { user, token };
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const resolved = resolveSessionUser(req);
  if (resolved) {
    req.authUser = resolved.user;
    req.authToken = resolved.token;
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const resolved = resolveSessionUser(req);
  if (!resolved) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  req.authUser = resolved.user;
  req.authToken = resolved.token;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const resolved = resolveSessionUser(req);
  if (!resolved) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (resolved.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Administrator access required.' });
  }
  req.authUser = resolved.user;
  req.authToken = resolved.token;
  next();
}
