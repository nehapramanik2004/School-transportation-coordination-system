import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Heading, PanelTitle, StatusChip, currentTrip, getBus, getDriver } from '../components/UI.jsx';

const ROUTE_DURATION_MS = 28000;

function DemoTrackingMap({ route, bus, driver, trip, lastUpdated }) {
  const routePath = useRef(null);
  const [busPosition, setBusPosition] = useState({ x: 90, y: 400, angle: 0 });
  const routeStops = route?.stops || [];
  const routeLength = routePath.current?.getTotalLength() || 0;
  const stopPoints = routeLength > 0
    ? routeStops.map((_, index) => routePath.current.getPointAtLength(routeLength * (routeStops.length <= 1 ? 0.94 : index / (routeStops.length - 1))))
    : [];

  useEffect(() => {
    if (!routePath.current) return undefined;
    const path = routePath.current;
    const length = path.getTotalLength();
    const startedAt = performance.now();
    let frame = 0;
    let previousPaint = 0;

    const animate = now => {
      if (now - previousPaint >= 80) {
        const progress = ((now - startedAt) % ROUTE_DURATION_MS) / ROUTE_DURATION_MS;
        const distance = progress * length;
        const point = path.getPointAtLength(distance);
        const next = path.getPointAtLength(Math.min(distance + 2, length));
        const angle = Math.atan2(next.y - point.y, next.x - point.x) * (180 / Math.PI);
        setBusPosition({ x: point.x, y: point.y, angle });
        previousPaint = now;
      }
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [route?.id]);

  return <div className="demo-map-frame">
    <div className="demo-map-topline">
      <span className="demo-map-route"><i/> {route?.name || 'Sample school route'}</span>
      <span className="demo-map-updated"><i className="demo-pulse"/> Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
    </div>
    <div className="demo-map-canvas">
      <svg className="demo-map-svg" viewBox="0 0 900 520" role="img" aria-label={`Demo map with simulated bus moving along ${route?.name || 'the sample route'}`}>
        <defs>
          <pattern id="demo-map-grid" width="150" height="130" patternUnits="userSpaceOnUse">
            <path d="M0 24H150M35 0V130M112 0V130" fill="none" stroke="#fff" strokeWidth="17"/>
            <path d="M0 24H150M35 0V130M112 0V130" fill="none" stroke="#d6e1e9" strokeWidth="1.5" strokeDasharray="4 5"/>
          </pattern>
          <filter id="demo-bus-shadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#203b5d" floodOpacity=".22"/>
          </filter>
        </defs>
        <rect width="900" height="520" fill="#edf4f4"/>
        <rect width="900" height="520" fill="url(#demo-map-grid)"/>
        <path d="M-20 110C130 140 190 80 310 96S520 160 625 118 805 34 930 58" fill="none" stroke="#d1eaf0" strokeWidth="30"/>
        <path d="M-20 110C130 140 190 80 310 96S520 160 625 118 805 34 930 58" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="12 11"/>
        <path d="M53 60 131 52 160 115 119 167 52 151Z" fill="#d8edda" stroke="#c2dfca" strokeWidth="2"/>
        <path d="M658 352 748 334 790 394 760 460 681 452 636 400Z" fill="#d8edda" stroke="#c2dfca" strokeWidth="2"/>
        <path d="M290 302 339 276 385 300 374 350 316 359Z" fill="#e3efdc" stroke="#cfdfc5" strokeWidth="2"/>
        <text className="demo-map-street" x="180" y="89" transform="rotate(-8 180 89)">LAKEVIEW AVENUE</text>
        <text className="demo-map-street" x="568" y="431" transform="rotate(-9 568 431)">PARK STREET</text>
        <text className="demo-map-street" x="727" y="195" transform="rotate(48 727 195)">SCHOOL ROAD</text>
        <path className="demo-route-outline" d="M90 400 C145 336 180 330 235 335 S324 375 400 350 S490 210 555 235 S650 275 700 248 S767 159 815 105"/>
        <path ref={routePath} className="demo-route-line" d="M90 400 C145 336 180 330 235 335 S324 375 400 350 S490 210 555 235 S650 275 700 248 S767 159 815 105"/>
        {stopPoints.map((point, index) => <g key={`${routeStops[index]}-${index}`} className="demo-stop-marker" aria-label={routeStops[index]}>
          <circle cx={point.x} cy={point.y} r="11"/>
          <circle cx={point.x} cy={point.y} r="4"/>
        </g>)}
        <g className="demo-school-marker" transform="translate(815 105)">
          <circle r="22"/><path d="M-11 1 0-9 11 1v10H4V4h-8v7h-7z"/>
          <text x="0" y="39" textAnchor="middle">NORTHVIEW SCHOOL</text>
        </g>
        <g className="demo-bus-marker" transform={`translate(${busPosition.x} ${busPosition.y}) rotate(${busPosition.angle})`} filter="url(#demo-bus-shadow)">
          <circle className="demo-bus-halo" r="28"/>
          <rect className="demo-bus-body" x="-19" y="-13" width="38" height="26" rx="8"/>
          <path className="demo-bus-window" d="M-12-8h8v7h-8zM2-8h8v7H2z"/>
          <path className="demo-bus-grille" d="M12 4h4"/>
          <circle className="demo-bus-wheel" cx="-11" cy="12" r="3"/><circle className="demo-bus-wheel" cx="11" cy="12" r="3"/>
          <title>{`${bus?.label || 'Demo bus'} · simulated GPS position`}</title>
        </g>
        <text className="demo-map-neighborhood" x="72" y="492">NORTHVIEW DISTRICT · SCHEMATIC MAP</text>
      </svg>
      <div className="demo-map-key"><span><i className="demo-key-route"/> Sample route</span><span><i className="demo-key-stop"/> Route stop</span></div>
      <div className="demo-map-bus-label"><Icon name="bus"/><span><b>{bus?.label || 'Demo bus'}</b><small>{driver?.name || 'Driver unassigned'}</small></span></div>
    </div>
    <div className="demo-map-footer"><span><b>DEMO TRACKING</b> · Simulated GPS movement</span><span>{trip?.eta ? `Sample ETA ${trip.eta}` : 'Illustrative route · no live GPS'}</span></div>
  </div>;
}

export default function Tracking({ data }) {
  const [selectedRouteId, setSelectedRouteId] = useState(data.routes[0]?.id || '');
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const route = data.routes.find(item => item.id === selectedRouteId) || data.routes[0];
  const bus = getBus(data, route);
  const driver = getDriver(data, route);
  const trip = currentTrip(data, route?.id);

  useEffect(() => {
    const timer = window.setInterval(() => setLastUpdated(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <>
    <Heading title="Live tracking" description="Watch a bus travel the school's sample route."/>
    <section className="tracking-dashboard">
      <article className="panel demo-tracking-panel">
        <div className="demo-tracking-heading">
          <div><span className="demo-tracking-kicker"><i/> Demo Tracking – Simulated GPS</span><h2>{bus?.label || 'Demo bus'} on the route</h2><p>Bus movement is simulated for demonstration. No live vehicle location is connected.</p></div>
          <label className="demo-route-select"><span>Sample route</span><select aria-label="Choose sample route" value={route?.id || ''} onChange={event => setSelectedRouteId(event.target.value)} disabled={!data.routes.length}>{data.routes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <DemoTrackingMap route={route} bus={bus} driver={driver} trip={trip} lastUpdated={lastUpdated}/>
        <div className="demo-route-stops"><span>ROUTE STOPS</span>{(route?.stops || []).map((stop, index) => <span className={`demo-route-stop ${index === route.stops.length - 1 ? 'destination' : ''}`} key={`${stop}-${index}`}><i/>{stop}</span>)}</div>
      </article>
      <aside className="tracking-side-column">
        <article className="panel demo-status-panel">
          <PanelTitle title="Vehicle status" subtitle="Sample trip details"/>
          <div className="demo-status-list">
            <div className="demo-status-row"><span>Trip status</span>{trip ? <StatusChip status={trip.status}/> : <span className="status-chip scheduled">No trip today</span>}</div>
            <div className="demo-status-row"><span>Simulation</span><b className="demo-moving"><i className="demo-pulse"/> Moving along route</b></div>
            <div className="demo-status-row"><span>Last updated</span><b>{lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</b></div>
            <div className="demo-status-row"><span>Driver</span><b>{driver?.name || 'Unassigned'}</b></div>
            <div className="demo-status-row"><span>Vehicle</span><b>{bus?.number || 'Unassigned'}</b></div>
          </div>
          <div className="demo-tracking-note"><Icon name="alert"/><span>Demo Tracking – Simulated GPS. The moving marker is illustrative and does not use real GPS data.</span></div>
        </article>
        <article className="panel demo-fleet-panel">
          <PanelTitle title="Sample fleet" subtitle="Routes in the demo workspace"/>
          <div className="activity-list">{data.routes.map(item => {
            const itemBus = getBus(data, item), itemDriver = getDriver(data, item), itemTrip = currentTrip(data, item.id);
            return <button type="button" className={`demo-fleet-row ${item.id === route?.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedRouteId(item.id)} aria-pressed={item.id === route?.id}>
              <span className="activity-symbol symbol-info"><Icon name="bus"/></span><span className="activity-copy"><b>{itemBus?.label || 'Bus'} · {item.name}</b><small>{itemDriver?.name || 'Driver unassigned'} · {itemTrip?.eta ? `Sample ETA ${itemTrip.eta}` : 'No trip scheduled'}</small></span><StatusChip status={itemTrip?.status || 'Scheduled'}/>
            </button>;
          })}</div>
        </article>
      </aside>
    </section>
  </>;
}
