import test from 'node:test';
import assert from 'node:assert/strict';
import { assignRouteCrew, scopeWorkspace } from '../controllers/transportController.js';
import { currentTrip, tripsForRouteOnDate } from '../../frontend/src/utils/dashboard.js';

test('Driver dashboard includes a new scheduled trip alongside an existing in-progress trip', () => {
  const data = { trips: [
    { id: 'trip-active', routeId: 'route-1', date: '2026-11-21', status: 'In progress' },
    { id: 'trip-new', routeId: 'route-1', date: '2026-11-21', status: 'Scheduled' },
    { id: 'trip-other-route', routeId: 'route-2', date: '2026-11-21', status: 'Scheduled' }
  ] };

  assert.equal(currentTrip(data, 'route-1', '2026-11-21').id, 'trip-active', 'active trip remains the dashboard control target');
  assert.deepEqual(tripsForRouteOnDate(data, 'route-1', '2026-11-21').map(trip => trip.id), ['trip-active', 'trip-new']);
});

test('Admin trip assignment persists the chosen driver and vehicle through the route workspace', () => {
  const db = {
    drivers: [
      { id: 'driver-a', name: 'Driver A', routeId: 'route-a', busId: 'bus-a' },
      { id: 'driver-b', name: 'Driver B', routeId: 'route-b', busId: 'bus-b' }
    ],
    buses: [
      { id: 'bus-a', label: 'Bus A', routeId: 'route-a' },
      { id: 'bus-b', label: 'Bus B', routeId: 'route-b' }
    ],
    routes: [
      { id: 'route-a', name: 'Route A', driverId: 'driver-a', busId: 'bus-a' },
      { id: 'route-b', name: 'Route B', driverId: 'driver-b', busId: 'bus-b' }
    ],
    students: [{ id: 'student-b', routeId: 'route-b', name: 'Student B' }],
    trips: [{ id: 'trip-b', routeId: 'route-b', status: 'Scheduled' }],
    alerts: [], settings: {}
  };

  const route = db.routes.find(item => item.id === 'route-b');
  assignRouteCrew(db, route, 'driver-a', 'bus-a');

  assert.equal(route.driverId, 'driver-a');
  assert.equal(route.busId, 'bus-a');
  assert.equal(db.drivers[0].routeId, 'route-b');
  assert.equal(db.drivers[0].busId, 'bus-a');
  assert.equal(db.routes[0].driverId, null, 'a driver cannot remain assigned to two routes');
  assert.equal(db.routes[0].busId, null, 'a bus cannot remain assigned to two routes');

  const refreshedDriverWorkspace = scopeWorkspace(db, { role: 'driver', driverId: 'driver-a' });
  assert.deepEqual(refreshedDriverWorkspace.drivers.map(item => item.name), ['Driver A']);
  assert.deepEqual(refreshedDriverWorkspace.routes.map(item => item.id), ['route-b']);
  assert.deepEqual(refreshedDriverWorkspace.buses.map(item => item.id), ['bus-a']);
  assert.deepEqual(refreshedDriverWorkspace.trips.map(item => item.id), ['trip-b']);
  assert.deepEqual(refreshedDriverWorkspace.students.map(item => item.id), ['student-b']);
});
