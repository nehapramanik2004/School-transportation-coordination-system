const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
  } catch {
    throw new Error('Cannot reach the API. Start the backend with npm run dev or npm start.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(payload.details) ? ` ${payload.details.join('. ')}` : '';
    throw new Error(`${payload.error || `Request failed (${response.status})`}${detail}`);
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
