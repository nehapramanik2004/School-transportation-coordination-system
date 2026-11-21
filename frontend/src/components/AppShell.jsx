import { useState } from 'react';
import Icon from './Icon.jsx';

const workspaceLinks = [
  ['overview', 'Overview', 'grid'], ['live-tracking', 'Live tracking', 'map'],
  ['trips', 'Trips', 'route'], ['students', 'Students', 'users'],
  ['drivers', 'Drivers & buses', 'steering'], ['routes', 'Routes', 'pin'],
  ['notifications', 'Notifications', 'bell'], ['login', 'Demo Preview', 'users']
];

export default function AppShell({ page, role, profileName = 'Dashboard Preview', profileLabel = 'DEMO DASHBOARD PREVIEW', unread, trackingCount = 0, isSignedIn = false, onNavigate, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = role === 'admin' ? workspaceLinks : workspaceLinks.filter(([id]) => ['overview', 'live-tracking', 'trips', 'notifications', 'login'].includes(id));
  const title = page === 'login' ? 'Demo Login' : role !== 'admin' && page === 'overview' ? `${role[0].toUpperCase()}${role.slice(1)} dashboard` : ({ overview: 'Overview', 'live-tracking': 'Live tracking', trips: 'Trips', students: 'Students', drivers: 'Drivers & buses', routes: 'Routes', notifications: 'Notifications', settings: 'Settings', help: 'Help & support' }[page] || 'Overview');
  const navigate = (next) => { onNavigate(next); setMenuOpen(false); };
  const profileInitials = profileName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'NV';

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`} id="sidebar">
      <a className="brand" href="#overview" onClick={event => { event.preventDefault(); navigate('overview'); }} aria-label="Northview home">
        <span className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 15.5 16 6l11 9.5V27H5z"/><path d="M12 27v-8h8v8M10 13h.01M16 13h.01M22 13h.01"/></svg></span>
        <span><b>northview</b><small>TRANSPORT</small></span>
      </a>
      <div className="workspace"><span className="workspace-logo">N</span><span><b>Northview Academy</b><small>School workspace</small></span><span className="chevron">⌄</span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="main-nav">{links.map(([id, label, icon]) => <a key={id} href={`#${id}`} onClick={event => { event.preventDefault(); navigate(id); }} data-page={id} className={`nav-link ${page === id ? 'active' : ''}`}><span className="nav-icon"><Icon name={icon}/></span><span>{label}</span>{id === 'live-tracking' && trackingCount > 0 && <span className="nav-pill">{trackingCount}</span>}{id === 'notifications' && unread > 0 && <span className="nav-dot"/>}</a>)}</nav>
      <div className="nav-label tools-label">PREFERENCES</div>
      <nav className="main-nav"><a href="#settings" onClick={event => {event.preventDefault();navigate('settings');}} data-page="settings" className={`nav-link ${page === 'settings' ? 'active' : ''}`}><span className="nav-icon"><Icon name="settings"/></span><span>Settings</span></a><a href="#help" onClick={event => {event.preventDefault();navigate('help');}} data-page="help" className={`nav-link ${page === 'help' ? 'active' : ''}`}><span className="nav-icon"><Icon name="help"/></span><span>Help & support</span></a></nav>
      <div className="sidebar-spacer"/>
      <div className="safety-card"><div className="safety-top"><span className="safety-shield"><Icon name="shield"/></span><span className="status-live">● SYSTEM OK</span></div><b>Every ride, accounted for.</b><p>Student safety is always in motion.</p></div>
      <button className="profile-card" onClick={() => window.dispatchEvent(new CustomEvent('app-toast', { detail: `Signed in as ${profileName}.` }))}><span className="avatar avatar-navy">{profileInitials}</span><span className="profile-copy"><b>{profileName}</b><small>{profileLabel}</small></span><span className="more">···</span></button>
      {isSignedIn ? <button className="signout-link" onClick={onLogout}><Icon name="logout"/><span>Sign out</span></button> : <button className="signout-link" onClick={() => navigate('login')}><Icon name="users"/><span>Demo Preview</span></button>}
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle navigation"><Icon name="menu"/></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><b>{title}</b></div><div className="top-actions"><div className="demo-badge"><span/> DEMO DATA</div><span className="account-role">{role[0].toUpperCase()}{role.slice(1)} account</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate('notifications')}><Icon name="bell"/>{unread > 0 && <i/>}</button><div className="top-divider"/><div className="today-label">{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div><span className="avatar avatar-navy top-avatar">{profileInitials}</span></div></header>
      <div className="page-wrap">{children}</div>
      <footer className="footer"><span>© 2026 Northview Academy</span><span><span className="green-dot"/> All systems operational <span className="footer-sep">·</span> Demo mode</span></footer>
    </main>
  </div>;
}
