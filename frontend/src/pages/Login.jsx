import { useState } from 'react';
import Icon from '../components/Icon.jsx';

const roles = [
  { id: 'admin', label: 'Admin', icon: 'settings' },
  { id: 'parent', label: 'Parent', icon: 'users' },
  { id: 'driver', label: 'Driver', icon: 'bus' }
];

export default function Login({ onLogin, demoMode = false, initialError = '' }) {
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try { await onLogin({ role, email, password }); }
    catch (caught) { setError(caught.message || 'Unable to sign in. Please try again.'); }
    finally { setSubmitting(false); }
  }

  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark"><Icon name="bus"/></span><span><b>northview</b><small>SCHOOL TRANSPORT</small></span></div>
    <div className="auth-heading"><span className="auth-eyebrow">{demoMode ? 'DEMO PREVIEW · NO REAL AUTH' : 'NORTHVIEW ACADEMY'}</span><h1>{demoMode ? 'Choose a dashboard preview' : 'Welcome back'}</h1><p>{demoMode ? 'Choose Admin, Parent, or Driver. Use any valid email and any non-empty password.' : 'Sign in to your transportation workspace.'}</p></div>
    <div className="auth-role-picker" role="group" aria-label="Choose account type">{roles.map(item => <button type="button" key={item.id} className={`auth-role ${role === item.id ? 'selected' : ''}`} onClick={() => { setRole(item.id); setPassword(''); setError(''); }} aria-pressed={role === item.id}><Icon name={item.icon}/><span>{item.label}</span></button>)}</div>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required placeholder="name@school.edu"/>
      <div className="auth-password-label"><label htmlFor="login-password">Password</label></div><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required placeholder="Enter any non-empty password"/>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : demoMode ? `Preview as ${role[0].toUpperCase()}${role.slice(1)}` : `Login as ${role[0].toUpperCase()}${role.slice(1)}`}<Icon name="arrow"/></button>
    </form>
    <div className="auth-footnote"><Icon name="shield"/><span>{demoMode ? 'DEMO PREVIEW only. Your email and password are not verified or stored. Parent and Driver views use demo records.' : 'Secure school workspace · Access depends on your configured account.'}</span></div>
  </section><aside className="auth-visual"><div className="auth-visual-copy"><span>SAFE RIDES START HERE</span><h2>Every journey,<br/>connected.</h2><p>School routes, trip updates and student check-ins in one place.</p></div><div className="auth-visual-art"><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/><span className="auth-bus-icon"><Icon name="bus"/></span><span className="auth-route-icon"><Icon name="pin"/></span><span className="auth-school-icon"><Icon name="grid"/></span><div className="auth-route-line"/></div><small className="auth-visual-caption">NORTHVIEW ACADEMY · TRANSPORTATION PORTAL</small></aside></main>;
}
