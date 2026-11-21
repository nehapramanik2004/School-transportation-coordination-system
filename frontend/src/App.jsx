import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import FormDialog from './components/FormDialog.jsx';
import { demoSignIn, getAuthMode, getSession, loadWorkspace, request, signIn, signOut } from './services/api.js';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Management from './pages/Management.jsx';
import Trips from './pages/Trips.jsx';
import Tracking from './pages/Tracking.jsx';
import Notifications from './pages/Notifications.jsx';
import { Help, Settings } from './pages/Settings.jsx';
import { localDateKey } from './utils/date.js';

function selectOptions(items, label) {
  return [{ value: '', label: 'Unassigned' }, ...items.map(item => ({ value: item.id, label: label(item) }))];
}

export default function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState('overview');
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [parentWorkspaceLoading, setParentWorkspaceLoading] = useState(false);
  const [demoModeAvailable, setDemoModeAvailable] = useState(false);
  const [authError, setAuthError] = useState('');
  const [childId, setChildId] = useState('stu-1');
  const [driverId, setDriverId] = useState('');
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');

  const role = session?.role || 'admin';
  const refresh = useCallback(async () => {
    try { const workspace = await loadWorkspace(); setData(workspace); setLoadError(''); }
    catch (error) { setLoadError(error.message); }
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mode = await getAuthMode();
        if (!active) return;
        setDemoModeAvailable(mode.demoLoginAvailable);
        const result = await getSession();
        if (!active) return;
        if (result.user) {
          setSession(result.user);
          if (result.user.studentId) setChildId(result.user.studentId);
          if (result.user.driverId) setDriverId(result.user.driverId);
          try { const workspace = await loadWorkspace(); if (active) setData(workspace); }
          catch (error) { if (active) setLoadError(error.message); }
        } else {
          try { const workspace = await loadWorkspace(); if (active) { setData(workspace); setLoadError(''); } }
          catch (error) { if (active) setLoadError(error.message); }
        }
      } catch (error) {
        if (active) {
          setAuthError(error.message);
          setLoadError(error.message);
        }
      }
      finally { if (active) setAuthLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const pageEvent = event => {
      if (role === 'admin' || ['overview', 'live-tracking', 'trips', 'notifications', 'settings', 'help', 'login'].includes(event.detail)) setPage(event.detail);
      else setPage('overview');
    };
    const toastEvent = event => setToast(event.detail);
    window.addEventListener('navigate-page', pageEvent);
    window.addEventListener('app-toast', toastEvent);
    return () => { window.removeEventListener('navigate-page', pageEvent); window.removeEventListener('app-toast', toastEvent); };
  }, [role]);

  async function handleLogin(credentials) {
    setAuthError('');
    const result = demoModeAvailable ? await demoSignIn(credentials) : await signIn(credentials);
    const isParent = result.user.role === 'parent';
    if (isParent) {
      setData(null);
      setParentWorkspaceLoading(true);
    }
    setSession(result.user);
    if (result.user.studentId) setChildId(result.user.studentId);
    if (result.user.driverId) setDriverId(result.user.driverId);
    setPage('overview'); setDialog(null); setLoadError('');
    try { const workspace = await loadWorkspace(); setData(workspace); }
    catch (error) { setLoadError(error.message); }
    finally { if (isParent) setParentWorkspaceLoading(false); }
  }

  async function handleLogout() {
    try { await signOut(); } catch (error) { notify(error.message); }
    setSession(null); setDialog(null); setPage('overview'); setLoadError(''); setAuthError('');
    if (demoModeAvailable) await refresh(); else setData(null);
  }

  const notify = message => setToast(message);
  const mutate = async (path, method, body, success) => {
    if (!session) { setPage('login'); notify('Use Demo Login to select a dashboard role.'); return; }
    try { await request(path, method, body); await refresh(); if (success) notify(success); }
    catch (error) { notify(error.message); }
  };

  const openDialog = spec => {
    if (spec.kind === 'export') {
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(file); anchor.download = 'northview-transport-report.json'; anchor.click(); URL.revokeObjectURL(anchor.href); notify('Workspace report downloaded.'); return;
    }
    if (!session) { setPage('login'); notify('Use Demo Login to access dashboard actions.'); return; }
    setDialog(spec);
  };

  const dialogConfig = useMemo(() => {
    if (!dialog || !data) return null;
    const existing = dialog.kind === 'student' ? data.students.find(item => item.id === dialog.id)
      : dialog.kind === 'driver' ? data.drivers.find(item => item.id === dialog.id)
      : dialog.kind === 'bus' ? data.buses.find(item => item.id === dialog.id)
      : dialog.kind === 'route' ? data.routes.find(item => item.id === dialog.id) : null;
    const edit = Boolean(existing);
    const routes = selectOptions(data.routes, item => item.name);
    const buses = selectOptions(data.buses, item => `${item.label} · ${item.number}`);
    const drivers = selectOptions(data.drivers, item => item.name);
    const common = (name, label, placeholder, type = 'text') => ({ name, label, placeholder, type });
    const configs = {
      student: { title: edit ? 'Edit student' : 'Add a student', description: 'Student profile, guardian contact and pickup assignment.', endpoint: `/students${edit ? `/${existing.id}` : ''}`, method: edit ? 'PATCH' : 'POST', submitLabel: edit ? 'Save changes' : 'Add student', fields: [common('name','Student name','e.g. Sam Lee'), common('grade','Grade & section','Grade 3 · A'), common('parent','Parent / guardian','e.g. Alex Lee'), common('phone','Phone number','+91 98765 00000','tel'), { name:'routeId',label:'Route',type:'select',options:routes }, common('stop','Pickup stop','e.g. Green Park Gate'), common('pickup','Pickup time','7:40 AM')] },
      driver: { title: edit ? 'Edit driver' : 'Add a driver', description: 'Maintain the driver’s contact and vehicle assignment.', endpoint: `/drivers${edit ? `/${existing.id}` : ''}`, method: edit ? 'PATCH' : 'POST', submitLabel: edit ? 'Save changes' : 'Add driver', fields: [common('name','Driver name','e.g. Amit Verma'), common('phone','Phone number','+91 98765 00000','tel'), { name:'routeId',label:'Assigned route',type:'select',required:false,options:routes }, { name:'busId',label:'Assigned bus',type:'select',required:false,options:buses }] },
      bus: { title: edit ? 'Edit bus' : 'Add a bus', description: 'Maintain the vehicle registration and passenger capacity.', endpoint: `/buses${edit ? `/${existing.id}` : ''}`, method: edit ? 'PATCH' : 'POST', submitLabel: edit ? 'Save changes' : 'Add bus', fields: [common('label','Bus label','Bus 05'), common('number','Registration number','DL 1C AB 0000'), { name:'capacity',label:'Seat capacity',type:'number',min:1 }, { name:'status',label:'Availability',type:'select',options:['Ready','On route','Maintenance'].map(value=>({value,label:value})) }] },
      route: { title: edit ? 'Edit route' : 'Create a route', description: 'Set route stops and assign a bus and driver.', endpoint: `/routes${edit ? `/${existing.id}` : ''}`, method: edit ? 'PATCH' : 'POST', submitLabel: edit ? 'Save changes' : 'Create route', fields: [common('name','Route name','e.g. Hillview Express'), { name:'color',label:'Route color',type:'select',options:['blue','purple','orange'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)})) }, { name:'busId',label:'Assigned bus',type:'select',required:false,options:buses }, { name:'driverId',label:'Assigned driver',type:'select',required:false,options:drivers }, { name:'stopsText',label:'Stops (separate with commas)',type:'textarea',full:true,placeholder:'First stop, Second stop, Northview Academy' }, common('startTime','Start time','7:20 AM'), common('duration','Estimated duration','40 min'), ...(edit ? [{ name:'status',label:'Status',type:'select',options:['Active','Paused'].map(value=>({value,label:value})) }] : [])] },
      trip: { title:'Schedule a trip', description:'Add a trip and assign its driver and vehicle.', endpoint:'/trips', method:'POST', submitLabel:'Schedule trip', fields:[{ name:'routeId',label:'Route',type:'select',options:routes.filter(option=>option.value) },{ name:'driverId',label:'Assigned driver',type:'select',options:drivers.filter(option=>option.value) },{ name:'busId',label:'Assigned vehicle',type:'select',options:buses.filter(option=>option.value) },{ name:'type',label:'Trip type',type:'select',options:['Morning pickup','Afternoon drop'].map(value=>({value,label:value}))},common('eta','Estimated arrival','8:30 AM')] },
      alert: { title:'Send emergency or delay alert', description:'Add an alert to the local demo notification feed.', endpoint:'/alerts', method:'POST', submitLabel:'Send alert', fields:[{ name:'type',label:'Alert type',type:'select',options:['Emergency','Delay'].map(value=>({value,label:value}))},{ name:'title',label:'Message',type:'textarea',full:true,placeholder:'Describe the emergency or delay' },common('detail','Additional detail','Driver alert · Northview Academy')] }
    };
    const config = configs[dialog.kind];
    if (!config) return null;
    const firstTripRoute = dialog.kind === 'trip' ? data.routes.find(route => route.status === 'Active') || data.routes[0] : null;
    return { ...config, initial: existing ? { ...existing, stopsText: Array.isArray(existing.stops) ? existing.stops.join(', ') : '' } : dialog.kind === 'trip' ? { routeId: firstTripRoute?.id || '', driverId: firstTripRoute?.driverId || '', busId: firstTripRoute?.busId || '' } : undefined };
  }, [dialog, data]);

  async function submitDialog(values) {
    const body = { ...values };
    if (dialog.kind === 'route') { body.stops = body.stopsText.split(',').map(stop => stop.trim()).filter(Boolean); delete body.stopsText; }
    if (dialog.kind === 'trip') body.date = localDateKey();
    if (dialog.kind === 'alert' && !body.detail) body.detail = 'Northview Academy · demo alert';
    await request(dialogConfig.endpoint, dialogConfig.method, body);
    await refresh();
    notify(dialog.kind === 'alert' ? 'Alert added to the demo feed.' : 'Changes saved successfully.');
  }

  if (authLoading) return <main className="auth-loading"><div className="loading"><span className="spinner"/> Loading your dashboard</div></main>;

  const selectedChild = data?.students.find(student => student.id === childId) || data?.students[0];
  const selectedDriver = data?.drivers.find(driver => driver.id === driverId) || data?.drivers[0];
  const profileName = session ? (role === 'parent' ? selectedChild?.parent || session.name || 'Parent' : role === 'driver' ? selectedDriver?.name || 'Driver' : session.name || 'Administrator') : 'Dashboard Preview';
  const profileLabel = session ? `${role[0].toUpperCase()}${role.slice(1)} - ${session.email}${session.demo ? ' - DEMO' : ''}` : 'DEMO DASHBOARD PREVIEW';

  let content;
  if (page === 'login') content = <Login onLogin={handleLogin} demoMode={demoModeAvailable} initialError={authError}/>;
  else if (parentWorkspaceLoading) content = <section className="panel"><div className="loading"><span className="spinner"/> Loading Parent dashboard</div></section>;
  else if (!data) content = <section className="panel connection-error"><div className="panel-title">Dashboard is ready when the API is available</div><p>{loadError || authError || 'The API has not returned workspace data.'}</p><div className="heading-actions"><button className="button button-primary" onClick={refresh}>Retry dashboard</button><button className="button" onClick={() => setPage('login')}>Open Login</button></div></section>;
  else if (page === 'overview') content = <Overview role={role} data={data} childId={childId} setChildId={setChildId} driverId={driverId} setDriverId={setDriverId} notify={notify} mutate={mutate} openDialog={openDialog}/>;
  else if (['students','drivers','routes'].includes(page) && role === 'admin') content = <Management page={page} data={data} openDialog={openDialog} mutate={mutate}/>;
  else if (page === 'trips') content = <Trips data={data} role={role} openDialog={openDialog} mutate={mutate}/>;
  else if (page === 'live-tracking') content = <Tracking data={data}/>;
  else if (page === 'notifications') content = <Notifications data={data} role={role} mutate={mutate}/>;
  else if (page === 'settings') content = <Settings data={data}/>;
  else content = <Help/>;

  return <><AppShell page={page} role={role} profileName={profileName} profileLabel={profileLabel} isSignedIn={Boolean(session)} unread={data?.alerts.filter(alert => !alert.read).length || 0} trackingCount={data?.trips.filter(trip => trip.date === localDateKey() && trip.status === 'In progress').length || 0} onNavigate={setPage} onLogout={handleLogout}>{content}</AppShell>{dialogConfig && session && <FormDialog {...dialogConfig} onClose={() => setDialog(null)} onSubmit={submitDialog}/>}<div className="toast-region" aria-live="polite">{toast && <div className="toast">{toast}</div>}</div></>;
}
