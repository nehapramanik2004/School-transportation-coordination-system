import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSeed } from '../data/seed.js';
import { normalizeDemoTripDates, offsetSchoolDate, schoolDateKey } from '../utils/schoolDate.js';

test('school dates use Asia/Kolkata across the UTC date boundary', () => {
  const beforeIndiaMidnight = new Date('2026-11-20T18:29:59.000Z');
  const atIndiaMidnight = new Date('2026-11-20T18:30:00.000Z');

  assert.equal(schoolDateKey(beforeIndiaMidnight), '2026-11-20');
  assert.equal(schoolDateKey(atIndiaMidnight), '2026-11-21');
  assert.equal(offsetSchoolDate('2026-11-21', -1), '2026-11-20');
});

test('new demo trips use the current school date and keep completed trips historical', () => {
  const today = schoolDateKey();
  const seed = createSeed();
  const currentTrips = seed.trips.filter(trip => trip.status !== 'Completed');
  const completedTrips = seed.trips.filter(trip => trip.status === 'Completed');

  assert.ok(currentTrips.length > 0);
  assert.ok(currentTrips.every(trip => trip.date === today));
  assert.ok(completedTrips.every(trip => trip.date === offsetSchoolDate(today, -1)));
});

test('stale open demo trips are presented as today without changing stored data', () => {
  const source = {
    settings: { demoMode: true },
    trips: [
      { id: 'active', date: '2026-11-20', status: 'In progress', simulated: true },
      { id: 'scheduled', date: '2026-11-19', status: 'Scheduled', simulated: true },
      { id: 'completed', date: '2026-11-19', status: 'Completed', simulated: true },
      { id: 'real', date: '2026-11-19', status: 'In progress', simulated: false }
    ]
  };

  const normalized = normalizeDemoTripDates(source, '2026-11-21');

  assert.deepEqual(normalized.trips.map(trip => trip.date), [
    '2026-11-21', '2026-11-21', '2026-11-19', '2026-11-19'
  ]);
  assert.deepEqual(source.trips.map(trip => trip.date), [
    '2026-11-20', '2026-11-19', '2026-11-19', '2026-11-19'
  ]);
  assert.notEqual(normalized, source);
});

test('non-demo trip dates are not normalized', () => {
  const source = { settings: { demoMode: false }, trips: [{ date: '2026-11-20', status: 'In progress', simulated: true }] };
  assert.equal(normalizeDemoTripDates(source, '2026-11-21'), source);
});

test('trip API presents current demo dates without writing the JSON snapshot', async t => {
  const databaseFile = fileURLToPath(new URL('../data/db.json', import.meta.url));
  if (!existsSync(databaseFile)) {
    t.skip('Read-only API integration test requires the existing JSON snapshot');
    return;
  }

  process.env.DATA_STORE = 'json';
  process.env.NODE_ENV = 'test';
  process.env.DEMO_LOGIN = 'true';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  const digest = () => createHash('sha256').update(readFileSync(databaseFile)).digest('hex');
  const before = digest();
  const { createApp } = await import('../server.js');
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));

  try {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const login = async role => {
      const response = await fetch(`${base}/auth/demo-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, email: `${role}@example.test`, password: 'audit-only' })
      });
      assert.equal(response.status, 200);
      return response.headers.get('set-cookie').split(';')[0];
    };

    const adminCookie = await login('admin');
    const tripsResponse = await fetch(`${base}/trips`, { headers: { cookie: adminCookie } });
    const trips = await tripsResponse.json();
    const today = schoolDateKey();
    assert.equal(tripsResponse.status, 200);
    assert.ok(trips.filter(trip => trip.simulated && trip.status !== 'Completed').length > 0);
    assert.ok(trips.filter(trip => trip.simulated && trip.status !== 'Completed').every(trip => trip.date === today));

    const summaryResponse = await fetch(`${base}/summary`, { headers: { cookie: adminCookie } });
    const summary = await summaryResponse.json();
    assert.equal(summaryResponse.status, 200);
    assert.ok(summary.todaysTrips > 0);

    const parentCookie = await login('parent');
    const parentResponse = await fetch(`${base}/bootstrap`, { headers: { cookie: parentCookie } });
    const parent = await parentResponse.json();
    assert.equal(parentResponse.status, 200);
    assert.deepEqual(parent.students.map(student => student.id), ['stu-1']);
    assert.ok(parent.trips.every(trip => !trip.simulated || trip.status === 'Completed' || trip.date === today));
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }

  assert.equal(digest(), before, 'read-only date projection must not alter backend/data/db.json');
});
