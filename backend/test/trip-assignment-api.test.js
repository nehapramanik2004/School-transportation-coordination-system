import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { schoolDateKey } from '../utils/schoolDate.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDatabase = path.join(backendDir, 'data', 'db.json');
const hash = value => createHash('sha256').update(value).digest('hex');

test('Admin trip assignment is available to the Driver after a fresh API load', async () => {
  process.env.DATA_STORE = 'json';
  process.env.NODE_ENV = 'test';
  process.env.DEMO_LOGIN = 'true';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  delete process.env.AUTH_DRIVER_ID;

  const originalHash = hash(await readFile(sourceDatabase));
  const tempDir = await mkdtemp(path.join(path.dirname(backendDir), '.trip-assignment-e2e-'));
  let server;
  try {
    const isolatedBackend = path.join(tempDir, 'backend');
    await cp(backendDir, isolatedBackend, { recursive: true, filter: source => !source.includes('.trip-assignment-e2e-') });
    const isolatedDatabase = path.join(isolatedBackend, 'data', 'db.json');
    const fixture = JSON.parse(await readFile(isolatedDatabase, 'utf8'));
    fixture.settings.demoMode = true;
    fixture.trips.unshift({ id: 'trip-existing-active', routeId: 'route-3', date: schoolDateKey(), type: 'Morning pickup', eta: '8:00 AM', status: 'In progress', startedAt: new Date().toISOString(), attendance: {}, simulated: true });
    await writeFile(isolatedDatabase, JSON.stringify(fixture, null, 2), 'utf8');
    const { createApp } = await import(`${pathToFileURL(path.join(isolatedBackend, 'server.js')).href}?test=${Date.now()}`);
    server = createApp().listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = (endpoint, options = {}) => fetch(`${base}${endpoint}`, options);
    const login = async (role, email) => {
      const response = await call('/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, email, password: 'demo' }) });
      assert.equal(response.status, 200);
      return response.headers.get('set-cookie').split(';')[0];
    };

    const adminCookie = await login('admin', 'admin@example.com');
    const create = await call('/trips', {
      method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ routeId: 'route-3', driverId: 'drv-1', busId: 'bus-3', type: 'Morning pickup', eta: '8:15 AM', date: '2026-11-21' })
    });
    const createdPayload = await create.json();
    assert.equal(create.status, 201, JSON.stringify(createdPayload));
    const trip = createdPayload;
    const adminWorkspace = await (await call('/bootstrap', { headers: { cookie: adminCookie } })).json();
    const assignedRoute = adminWorkspace.routes.find(route => route.id === trip.routeId);
    assert.equal(assignedRoute.driverId, 'drv-1');
    assert.equal(assignedRoute.busId, 'bus-3');
    assert.ok(adminWorkspace.trips.some(item => item.id === trip.id));

    const driverCookie = await login('driver', 'driver@example.com');
    const workspaceResponse = await call('/bootstrap', { headers: { cookie: driverCookie } });
    assert.equal(workspaceResponse.status, 200);
    const workspace = await workspaceResponse.json();
    assert.deepEqual(workspace.drivers.map(driver => driver.name), ['Rajesh Kumar']);
    assert.deepEqual(workspace.routes.map(route => route.id), ['route-3']);
    assert.deepEqual(workspace.buses.map(bus => bus.id), ['bus-3']);
    assert.ok(workspace.trips.some(item => item.id === trip.id));
    assert.equal(workspace.trips.find(item => item.id === 'trip-existing-active').status, 'In progress');

    const refreshed = await (await call('/bootstrap', { headers: { cookie: driverCookie } })).json();
    assert.ok(refreshed.trips.some(item => item.id === trip.id), 'created trip is still present after a new workspace request');
    const status = await call(`/trips/${trip.id}/status`, {
      method: 'PATCH', headers: { cookie: driverCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'In progress' })
    });
    assert.equal(status.status, 200, 'the assigned Driver can update the trip');
  } finally {
    if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(tempDir, { recursive: true, force: true });
  }
  assert.equal(hash(await readFile(sourceDatabase)), originalHash, 'the project db.json is unchanged');
});
