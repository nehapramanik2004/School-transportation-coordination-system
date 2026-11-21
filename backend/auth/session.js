import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';

const COOKIE_NAME = 'northview_session';
const SESSION_SECONDS = 60 * 60 * 8;
const developmentSecret = randomBytes(32).toString('base64url');

const developmentAccounts = [
  { role: 'admin', email: 'admin@northview.local', password: 'AdminDemo!2026', name: 'Priya Mehta' },
  { role: 'parent', email: 'parent@northview.local', password: 'ParentDemo!2026', name: 'Parent Demo', studentId: 'stu-1' },
  { role: 'driver', email: 'driver@northview.local', password: 'DriverDemo!2026', name: 'Rajesh Kumar', driverId: 'drv-1' }
];

function configuredAccounts() {
  const production = process.env.NODE_ENV === 'production';
  const account = (role, envPrefix, fallback) => {
    const email = process.env[`${envPrefix}_EMAIL`] || (production ? '' : fallback.email);
    const password = process.env[`${envPrefix}_PASSWORD`] || (production ? '' : fallback.password);
    if (!email || !password) return null;
    return {
      role, email: email.trim().toLowerCase(), password,
      name: process.env[`${envPrefix}_NAME`] || fallback.name,
      ...(role === 'parent' ? { studentId: process.env.AUTH_PARENT_STUDENT_ID || (production ? '' : fallback.studentId) } : {}),
      ...(role === 'driver' ? { driverId: process.env.AUTH_DRIVER_ID || (production ? '' : fallback.driverId) } : {})
    };
  };
  return [
    account('admin', 'AUTH_ADMIN', developmentAccounts[0]),
    account('parent', 'AUTH_PARENT', developmentAccounts[1]),
    account('driver', 'AUTH_DRIVER', developmentAccounts[2])
  ].filter(Boolean);
}

export function validateAuthConfiguration() {
  if (process.env.NODE_ENV !== 'production') return;
  const required = ['AUTH_SESSION_SECRET', 'AUTH_ADMIN_EMAIL', 'AUTH_ADMIN_PASSWORD', 'AUTH_PARENT_EMAIL', 'AUTH_PARENT_PASSWORD', 'AUTH_PARENT_STUDENT_ID', 'AUTH_DRIVER_EMAIL', 'AUTH_DRIVER_PASSWORD', 'AUTH_DRIVER_ID'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) throw new Error(`Production authentication is missing configuration: ${missing.join(', ')}`);
  if (process.env.AUTH_SESSION_SECRET.length < 32) throw new Error('AUTH_SESSION_SECRET must be at least 32 characters.');
}

function sessionSecret() {
  return process.env.AUTH_SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : developmentSecret);
}

function sign(value) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function equalStrings(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`);
}

export function demoLoginAvailable() {
  return process.env.NODE_ENV !== 'production' && process.env.DEMO_LOGIN !== 'false';
}

function establishSession(user, res) {
  const payload = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
  setSessionCookie(res, `${payload}.${sign(payload)}`);
  res.json({ user });
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`);
}

function cookieFromRequest(req) {
  const entry = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`));
  return entry ? entry.slice(COOKIE_NAME.length + 1) : '';
}

export function readSession(req) {
  const token = cookieFromRequest(req);
  if (!token || !sessionSecret()) return null;
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const payload = token.slice(0, separator), signature = token.slice(separator + 1);
  if (!equalStrings(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.user || parsed.expiresAt <= Date.now()) return null;
    return parsed.user;
  } catch { return null; }
}

export function login(req, res) {
  const role = req.body?.role;
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const accounts = configuredAccounts();
  const account = accounts.find(item => item.role === role && item.email === email);
  const passwordMatches = equalStrings(password, account?.password || 'northview-invalid-login-padding');
  if (!account || !passwordMatches) throw new HttpError(401, 'Email or password is incorrect.');
  if ((role === 'parent' && !account.studentId) || (role === 'driver' && !account.driverId)) throw new HttpError(503, 'This demo account is not linked to a school record.');

  const user = { id: account.email, email: account.email, name: account.name, role, ...(account.studentId ? { studentId: account.studentId } : {}), ...(account.driverId ? { driverId: account.driverId } : {}) };
  establishSession(user, res);
}

export function demoLogin(req, res) {
  if (!demoLoginAvailable()) throw new HttpError(404, 'Demo login is disabled.');
  const role = req.body?.role;
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!['admin', 'parent', 'driver'].includes(role)) throw new HttpError(400, 'Choose Admin, Parent, or Driver.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!password.trim()) throw new HttpError(400, 'Enter a non-empty password.');

  const name = email.split('@')[0].replace(/[._+-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const user = {
    id: `demo:${role}:${email}`,
    email,
    name,
    role,
    demo: true,
    ...(role === 'parent' ? { studentId: process.env.AUTH_PARENT_STUDENT_ID || 'stu-1' } : {}),
    ...(role === 'driver' ? { driverId: process.env.AUTH_DRIVER_ID || 'drv-1' } : {})
  };
  establishSession(user, res);
}

export function session(req, res) {
  res.json({ user: readSession(req) });
}

export function logout(_req, res) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

