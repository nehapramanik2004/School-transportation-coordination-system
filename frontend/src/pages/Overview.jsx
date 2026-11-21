import Icon from '../components/Icon.jsx';
import schoolTransportScene from '../assets/school-transport-scene.svg';
import { ActivityList, Button, Heading, MapIllustration, Metric, PanelTitle, StatusChip, TripTable, currentTrip, getBus, getDriver, getRoute } from '../components/UI.jsx';
import { localDateKey } from '../utils/date.js';
import { parentGreeting, selectedDriver } from '../utils/dashboard.js';

function SchoolBanner({ children }) {
  return <section className="school-banner"><img className="school-banner-art" src={schoolTransportScene} alt="Illustration of Northview Academy, trees and a yellow school bus"/><div className="school-banner-content">{children}</div></section>;
}

function WeeklyTripsChart({ trips }) {
  const today = localDateKey();
  const [year, month, day] = today.split('-').map(Number);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day - 6 + index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat([], { weekday: 'short', timeZone: 'UTC' }).format(date), count: trips.filter(trip => trip.date === key).length };
  });
  const max = Math.max(1, ...days.map(item => item.count));
  const total = days.reduce((sum, item) => sum + item.count, 0);
  return <><div className="chart-area"><svg viewBox="0 0 620 160" preserveAspectRatio="none" role="img" aria-label={`${total} recorded trips across the last seven days`}><g stroke="#e7eef8" strokeWidth="1"><path d="M0 25H620M0 62H620M0 99H620M0 136H620"/></g>{days.map((item, index) => { const height = item.count ? Math.max(8, (item.count / max) * 96) : 0; return <g key={item.key}><rect x={22 + index * 86} y={136 - height} width="42" height={height} rx="7" fill={item.count ? '#3478ed' : '#e4edf9'}/>{item.count > 0 && <text x={43 + index * 86} y={128 - height} textAnchor="middle" fill="#345477" fontSize="11">{item.count}</text>}</g>; })}</svg></div><div className="chart-labels">{days.map(item => <span key={item.key}>{item.label}</span>)}</div></>;
}

function TodayTripsTable({ data, trips, mutate }) {
  return <div className="table-wrap"><table className="data-table today-trips-table"><thead><tr><th>TRIP</th><th>ROUTE</th><th>DRIVER</th><th>BUS</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{trips.map(trip => {
    const route = getRoute(data, trip.routeId), driver = getDriver(data, route), bus = getBus(data, route);
    const nextStatus = trip.status === 'Scheduled' ? 'In progress' : 'Completed';
    const actionLabel = trip.status === 'Scheduled' ? 'Start trip' : trip.status === 'In progress' ? 'End trip' : '—';
    return <tr key={trip.id}><td className="person-cell">{trip.id}</td><td>{route?.name || 'Unassigned route'}</td><td>{driver?.name || 'Unassigned'}</td><td>{bus?.number || 'Unassigned'}</td><td><StatusChip status={trip.status}/></td><td>{trip.status === 'Completed' ? '—' : <button className="table-action" onClick={() => mutate(`/trips/${trip.id}/status`, 'PATCH', { status: nextStatus }, trip.status === 'Scheduled' ? 'Trip started.' : 'Trip completed.')}>{actionLabel}</button>}</td></tr>;
  })}{!trips.length && <tr><td className="table-empty" colSpan="6">No trips scheduled for today.</td></tr>}</tbody></table></div>;
}

function TodayService({ trips }) {
  const completed = trips.filter(trip => trip.status === 'Completed').length;
  const inProgress = trips.filter(trip => trip.status === 'In progress').length;
  const scheduled = trips.filter(trip => trip.status === 'Scheduled').length;
  const completion = trips.length ? Math.round((completed / trips.length) * 100) : 0;
  return <article className="panel service-panel"><PanelTitle title="Today’s service" subtitle="Live counts from today’s trip records"/>
    <div className="service-summary"><div className="service-ring" style={{ '--completion': `${completion}%` }}><div><strong>{trips.length ? `${completion}%` : '—'}</strong><span>completed</span></div></div><div className="service-counts"><div><i className="service-dot in-progress"/><span>In progress</span><b>{inProgress}</b></div><div><i className="service-dot scheduled"/><span>Scheduled</span><b>{scheduled}</b></div><div><i className="service-dot completed"/><span>Completed</span><b>{completed}</b></div></div></div>
    <div className="service-note"><Icon name="shield"/>{trips.length ? `${trips.length} trip${trips.length === 1 ? '' : 's'} recorded today.` : 'No trips are recorded for today yet.'}</div>
  </article>;
}

function QuickActions({ trips, openDialog, mutate }) {
  const nextTrip = trips.find(trip => trip.status === 'Scheduled');
  const quickAction = (icon, label, action, disabled = false) => <button type="button" className="quick-action" onClick={action} disabled={disabled}><span className="quick-action-icon"><Icon name={icon}/></span><b>{label}</b></button>;
  return <article className="panel quick-actions-panel"><PanelTitle title="Quick actions" subtitle="Shortcuts for common tasks"/><div className="quick-actions-grid">
    {quickAction('play', 'Start trip', () => nextTrip && mutate(`/trips/${nextTrip.id}/status`, 'PATCH', { status: 'In progress' }, 'Trip started.'), !nextTrip)}
    {quickAction('pin', 'View routes', () => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'routes' })))}
    {quickAction('download', 'Export report', () => openDialog({ kind: 'export' }))}
    {quickAction('settings', 'Settings', () => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'settings' })))}
  </div></article>;
}

function AdminOverview({ data, openDialog, mutate }) {
  const today = localDateKey();
  const trips = data.trips.filter(trip => trip.date === today);
  const summary = { students: data.students.length, drivers: data.drivers.length, buses: data.buses.length, routes: data.routes.filter(route => route.status === 'Active').length };
  return <>
    <SchoolBanner><Heading title="Welcome back, Admin! 👋" description="Manage school transportation efficiently and safely." actions={<><span className="date-chip"><Icon name="calendar"/>{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span><Button primary onClick={() => openDialog({ kind: 'trip' })}><Icon name="plus"/> Add Trip</Button><Button onClick={() => openDialog({ kind: 'student' })}><Icon name="plus"/> Add student</Button></>}/></SchoolBanner>
    <section className="metric-grid"><Metric title="Total students" value={summary.students} foot="Registered student profiles" color="blue" icon="users"/><Metric title="Total drivers" value={summary.drivers} foot={`${data.drivers.filter(driver => driver.status === 'On route').length} currently on route`} color="purple" icon="steering"/><Metric title="Total buses" value={summary.buses} foot={`${data.buses.filter(bus => bus.status === 'On route').length} currently on route`} color="green" icon="bus"/><Metric title="Active routes" value={summary.routes} foot="Routes marked active" color="orange" icon="route"/></section>
    <section className="dashboard-grid"><article className="panel today-trips-panel"><PanelTitle title="Today’s trips" subtitle={`${trips.length} trip${trips.length === 1 ? '' : 's'} on ${today}`} action={<button className="panel-link" onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'trips' }))}>View all <Icon name="arrow"/></button>}/><TodayTripsTable data={data} trips={trips} mutate={mutate}/></article><TodayService trips={trips}/></section>
    <section className="dashboard-grid secondary-dashboard-grid"><QuickActions trips={trips} openDialog={openDialog} mutate={mutate}/><article className="panel activity-panel"><PanelTitle title="Recent activity" subtitle="Latest updates from your fleet" action={<button className="panel-link" onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'notifications' }))}>View all <Icon name="arrow"/></button>}/><ActivityList alerts={data.alerts.slice(0, 4)}/></article></section>
    <section className="content-grid"><article className="panel chart-panel"><PanelTitle title="Trips this week" subtitle="Daily trip counts from stored records"/><WeeklyTripsChart trips={data.trips}/></article><article className="panel routes-summary-panel"><PanelTitle title="Active routes" subtitle={`${summary.routes} routes marked active`} action={<button className="panel-link" onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'routes' }))}>Manage routes <Icon name="arrow"/></button>}/><RouteTable data={data}/></article></section>
  </>;
}

function RouteTable({ data }) {
  return <div className="table-wrap"><table className="route-table"><thead><tr><th>ROUTE</th><th>DRIVER & BUS</th><th>STUDENTS</th><th>TRIP STATUS</th><th>CHECK-IN</th><th>ETA</th></tr></thead><tbody>{data.routes.map(route => { const driver = getDriver(data, route), bus = getBus(data, route), trip = currentTrip(data, route.id), students = data.students.filter(student => student.routeId === route.id), checkedIn = students.filter(student => ['Picked up', 'Dropped off'].includes(trip?.attendance?.[student.id])).length, progress = students.length ? Math.round((checkedIn / students.length) * 100) : 0; return <tr key={route.id}><td><span className="route-name"><i className={`route-color ${route.color || ''}`}/>{route.name}</span></td><td>{driver?.name || 'Unassigned'}<br/><span className="table-muted">{bus?.label || 'No bus'} · {bus?.number || ''}</span></td><td>{students.length}</td><td><StatusChip status={trip?.status || 'No trip today'}/></td><td><div className="route-progress"><div className="progress-line"><span style={{ width: `${progress}%` }}/></div><span className="progress-label">{trip ? `${checkedIn}/${students.length}` : '—'}</span></div></td><td>{trip?.eta || '—'}</td></tr>; })}</tbody></table></div>;
}

function ParentOverview({ data, childId, setChildId, notify }) {
  const child = data.students.find(student => student.id === childId) || data.students[0];
  const route = child && getRoute(data, child.routeId), trip = route && currentTrip(data, route.id), bus = getBus(data, route), driver = getDriver(data, route);
  const name = child?.name.split(' ')[0].toLowerCase() || '';
  const alerts = data.alerts.filter(alert => alert.title.toLowerCase().includes(name)).slice(0, 3);
  return <>
    <SchoolBanner><Heading title={parentGreeting(child)} description={child ? `${child.name}’s school journey, at a glance.` : 'Your child’s school journey, at a glance.'} actions={<><label className="field child-select"><select value={child?.id || ''} onChange={event => setChildId(event.target.value)} aria-label="Select child" disabled={data.students.length < 2}>{data.students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.grade}</option>)}</select></label><Button onClick={() => notify('School office: +91 11 4000 1234')}><Icon name="phone"/> Contact school</Button></>}/></SchoolBanner>
    {child ? <><section className="content-grid"><article className="panel" style={{ paddingBottom: 12 }}><PanelTitle title={`${child.name}’s journey`} subtitle={`${route?.name || 'No route assigned'} · ${bus?.label || 'School bus'}`} action={<StatusChip status={trip?.status || 'No trip today'}/>}/><MapIllustration/><div className="arrival-banner"><div><small>ESTIMATED ARRIVAL AT SCHOOL · DEMO ETA</small><b>{trip?.eta || 'No ETA'}</b></div><span className="metric-icon mi-blue"><Icon name="clock"/></span></div><div style={{ padding: '0 14px 4px' }}><div className="notice"><Icon name="alert"/> Demo route illustration only. Live vehicle location is unavailable for this school workspace.</div></div></article>
      <div className="stack-panels"><article className="panel"><PanelTitle title="Today’s trip" subtitle={trip?.status === 'In progress' ? 'Morning pickup is in progress' : trip ? 'Next scheduled school run' : 'No trip scheduled today'}/><div className="trip-list"><div className="trip-card active-trip"><div className="trip-card-head"><b>{route?.name || 'School route'}</b><StatusChip status={trip?.status || 'No trip today'}/></div><p>{bus?.number || 'Bus assignment pending'} · {driver?.name || 'Driver pending'}</p><p>Pickup at {child.pickup} · {child.stop}</p></div></div><div className="stop-list"><div className="stop-item"><i className="stop-marker"/><div className="stop-copy"><b>{child.stop}</b><small>Pickup stop</small></div><span className="stop-time">{child.pickup}</span></div><div className="stop-item"><i className="stop-marker"/><div className="stop-copy"><b>Northview Academy</b><small>Drop-off · estimated</small></div><span className="stop-time">{trip?.eta || 'No ETA'}</span></div></div></article><article className="panel"><PanelTitle title="Latest notifications" subtitle="Pickup, drop-off & route updates" action={<button className="panel-link" onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'notifications' }))}>All</button>}/><ActivityList alerts={alerts}/></article></div></section><section className="panel wide-panel"><PanelTitle title="Recent trip history" subtitle="Your child’s latest completed journeys" action={<button className="panel-link" onClick={() => window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'trips' }))}>View trip history <Icon name="arrow"/></button>}/><TripTable data={data} trips={data.trips.filter(item => item.attendance?.[child.id]).slice(0, 4)} actions={false}/></section></> : <section className="panel empty-state">No student profile is available yet.</section>}
  </>;
}

function DriverOverview({ data, driverId, setDriverId, mutate, openDialog }) {
  const driver = selectedDriver(data, driverId);
  const route = driver && getRoute(data, driver.routeId), bus = getBus(data, route), trip = route && currentTrip(data, route.id);
  const students = data.students.filter(student => student.routeId === route?.id);
  const pickedUp = students.filter(student => trip?.attendance?.[student.id] === 'Picked up').length;
  const updateStatus = () => trip && mutate(`/trips/${trip.id}/status`, 'PATCH', { status: trip.status === 'In progress' ? 'Completed' : 'In progress' }, trip.status === 'In progress' ? 'Trip completed.' : 'Trip started. Families can see the trip status.');
  const attendance = student => trip && mutate(`/trips/${trip.id}/attendance`, 'PATCH', { studentId: student.id, status: trip.attendance?.[student.id] === 'Upcoming' ? 'Picked up' : 'Dropped off' }, `${student.name} attendance updated.`);
  return <>
    <SchoolBanner><Heading title={`Good morning, ${driver?.name?.trim().split(/\s+/)[0] || 'Driver'} 👋`} description="Your route and student check-in for today." actions={<><label className="field dashboard-select"><span className="sr-only">Select driver</span><select value={driver?.id || ''} onChange={event => setDriverId(event.target.value)} aria-label="Select driver" disabled={data.drivers.length < 2}>{!data.drivers.length && <option value="">No drivers available</option>}{data.drivers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button danger onClick={() => openDialog({ kind: 'alert' })}><Icon name="alert"/> Emergency alert</Button></>}/></SchoolBanner>
    <section className="metric-grid"><Metric title="Assigned bus" value={bus?.label || 'Bus pending'} foot={bus?.number || 'No bus assigned'} color="blue" icon="bus"/><Metric title="Assigned route" value={route?.name || 'No route'} foot="Morning pickup" color="purple" icon="route"/><Metric title="Students on route" value={students.length} foot={`${pickedUp} picked up`} color="green" icon="users"/><Metric title="Estimated arrival" value={trip?.eta || '—'} foot={trip ? 'Demo estimate · not live GPS' : 'No trip scheduled today'} color="orange" icon="clock"/></section>
    <section className="content-grid"><article className="panel"><PanelTitle title="Today’s route" subtitle={`${route?.name || 'Route assignment pending'} · ${route?.duration || ''}`} action={<StatusChip status={trip?.status || 'No trip today'}/>}/><div className="stop-list">{(route?.stops || []).map((stop, index) => <div className="stop-item" key={stop}><i className="stop-marker"/><div className="stop-copy"><b>{stop}</b><small>{index === route.stops.length - 1 ? 'School drop-off' : `${index + 1} of ${route.stops.length - 1} pickup stops`}</small></div><span className="stop-time">{index === 0 ? route.startTime : index === route.stops.length - 1 ? trip?.eta || '—' : 'On route'}</span></div>)}</div><div className="panel-header" style={{ paddingTop: 0 }}><span/><Button primary={trip?.status !== 'In progress'} onClick={updateStatus} disabled={!trip}><Icon name={trip?.status === 'In progress' ? 'stop' : 'play'}/>{trip?.status === 'In progress' ? 'End trip' : 'Start trip'}</Button></div></article>
      <article className="panel"><PanelTitle title="Student check-in" subtitle="Update pickup and drop-off for each student" action={<span className="status-chip">{pickedUp}/{students.length} boarded</span>}/><div className="activity-list">{students.map(student => { const status = trip?.attendance?.[student.id] || 'Upcoming'; const label = status === 'Upcoming' ? 'Mark picked up' : status === 'Picked up' ? 'Mark dropped off' : 'Dropped off'; return <div className="activity-row" key={student.id}><span className="table-avatar">{student.avatar}</span><div className="activity-copy"><b>{student.name}</b><small>{student.stop} · {student.pickup} · {status}</small></div><Button primary={status !== 'Dropped off'} disabled={!trip || status === 'Dropped off'} onClick={() => attendance(student)}>{label}</Button></div>; })}{!students.length && <div className="empty-state">No students assigned to this route.</div>}</div></article></section>
    <section className="panel wide-panel"><PanelTitle title="Trip safety" subtitle="Keep families and school staff informed"/><div style={{ padding: '0 15px 15px' }}><div className="notice"><Icon name="sparkle"/> Pickup and drop updates create in-app notifications. Use Emergency alert to add a demo alert to the activity feed.</div></div></section>
  </>;
}

export default function Overview({ role, data, childId, setChildId, driverId, setDriverId, notify, mutate, openDialog }) {
  if (role === 'parent') return <ParentOverview data={data} childId={childId} setChildId={setChildId} notify={notify}/>;
  if (role === 'driver') return <DriverOverview data={data} driverId={driverId} setDriverId={setDriverId} mutate={mutate} openDialog={openDialog}/>;
  return <AdminOverview data={data} openDialog={openDialog} mutate={mutate}/>;
}
