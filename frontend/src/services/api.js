import { fetchWithRetry } from './fetchWithRetry.js';

const configuredApiBase = import.meta.env.VITE_API_URL?.trim();
const API_BASE = (import.meta.env.PROD ? '/api' : configuredApiBase || 'http://localhost:3000/api').replace(/\/+$/, '');

export async function api(path, options = {}) {
  if (!API_BASE) {
    throw new Error('Backend API is not configured. Set VITE_API_URL to your Render service URL ending in /api, then redeploy the Vercel frontend.');
  }
  let response;
  const method = (options.method || 'GET').toUpperCase();
  const retryable = ['GET', 'HEAD', 'OPTIONS'].includes(method)
    || /^\/auth\/(mode|session|login|demo-login|logout)$/.test(path);
  try {
    response = await fetchWithRetry(fetch, `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      credentials: 'include',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    }, { retries: retryable ? 1 : 0 });
  } catch {
    throw new Error(`Cannot reach the backend at ${API_BASE}. Check that the Render service is running, VITE_API_URL is correct, and Render FRONTEND_ORIGIN allows this Vercel domain.`);
  }
  const responseText = await response.text();
  let payload = {};
  try { payload = responseText ? JSON.parse(responseText) : {}; } catch { payload = {}; }
  if (!response.ok) {
    const detail = Array.isArray(payload.details) ? ` ${payload.details.join('. ')}` : '';
    const fallback = response.status >= 500 ? `Backend request failed (${response.status}). Check the Render service logs.` : `Request failed (${response.status})`;
    throw new Error(`${payload.error || fallback}${detail}`);
  }
  return payload;
}

export const loadWorkspace = () => api('/bootstrap');
export const request = (path, method, data) => api(path, { method, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
export const getSession = () => api('/auth/session');
export const getAuthMode = () => api('/auth/mode');
export const signIn = credentials => request('/auth/login', 'POST', credentials);
export const demoSignIn = credentials => request('/auth/demo-login', 'POST', credentials);
export const signOut = () => request('/auth/logout', 'POST', {});
