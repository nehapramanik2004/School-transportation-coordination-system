import test from 'node:test';
import assert from 'node:assert/strict';

// Keep auth flow tests on the existing local demo snapshot, regardless of any
// Neon setting in the developer's shell. These requests are read-only.
process.env.DATA_STORE = 'json';
process.env.NODE_ENV = 'test';
process.env.DEMO_LOGIN = 'true';
const { default: app } = await import('../server.js');

const accounts = [
  { role: 'admin', email: 'new.admin@example.com', password: 'anything-admin' },
  { role: 'parent', email: 'family.member@sample.org', password: 'any-parent-password' },
  { role: 'driver', email: 'driver.47@demo.net', password: 'any-driver-password' }
];

test('Admin, Parent and Driver sign-in, access, and sign-out flows', async t => {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (path, options = {}) => fetch(`${base}${path}`, options);

  try {
    const dashboardFirst = await call('/bootstrap');
    assert.equal(dashboardFirst.status, 200, 'local demo dashboard is available before login');
    assert.ok((await dashboardFirst.json()).students.length > 1, 'dashboard preview uses the existing project data');

    for (const account of accounts) await t.test(`${account.role} login is scoped to that role`, async () => {
      const response = await call('/auth/demo-login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(account)
      });
      assert.equal(response.status, 200);
      const { user } = await response.json();
      assert.equal(user.role, account.role);
      assert.equal(user.email, account.email);
      assert.equal(user.demo, true, 'demo login is explicitly marked as a preview account');
      const cookie = response.headers.get('set-cookie')?.split(';')[0];
      assert.ok(cookie, 'login returns a session cookie');

      const session = await call('/auth/session', { headers: { cookie } });
      assert.equal((await session.json()).user.role, account.role);
      const workspaceResponse = await call('/bootstrap', { headers: { cookie } });
      assert.equal(workspaceResponse.status, 200);
      const workspace = await workspaceResponse.json();

      if (account.role === 'admin') {
        assert.ok(workspace.students.length > 1, 'admin receives the full school workspace');
        assert.equal((await call('/students', { headers: { cookie } })).status, 200);
      } else if (account.role === 'parent') {
        assert.deepEqual(workspace.students.map(student => student.id), ['stu-1']);
        assert.equal((await call('/students', { headers: { cookie } })).status, 403);
        assert.equal((await call('/alerts/read', { method: 'PATCH', headers: { cookie } })).status, 403);
      } else {
        assert.deepEqual(workspace.drivers.map(driver => driver.id), ['drv-1']);
        assert.equal((await call('/drivers', { headers: { cookie } })).status, 403);
        assert.equal((await call('/trips', { headers: { cookie } })).status, 200);
        const wrongRoute = await call('/trips/trip-2/status', {
          method: 'PATCH', headers: { cookie, 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'In progress' })
        });
        assert.equal(wrongRoute.status, 403, 'driver cannot update another route’s trip');
      }

      const logout = await call('/auth/logout', { method: 'POST', headers: { cookie } });
      assert.equal(logout.status, 200);
      assert.equal((await (await call('/auth/session', { headers: { cookie: logout.headers.get('set-cookie')?.split(';')[0] } })).json()).user, null);
    });

    const invalid = await call('/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'admin', email: 'admin@northview.local', password: 'wrong-password' })
    });
    assert.equal(invalid.status, 401, 'invalid passwords are rejected');

    for (const body of [
      { role: 'admin', email: 'not-an-email', password: 'pass' },
      { role: 'admin', email: 'demo@example.com', password: '  ' },
      { role: 'unknown', email: 'demo@example.com', password: 'pass' }
    ]) {
      const invalidDemo = await call('/auth/demo-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      assert.equal(invalidDemo.status, 400);
    }

    const previousMode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const blockedDemo = await call('/auth/demo-login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(accounts[0])
      });
      assert.equal(blockedDemo.status, 404, 'demo bypass is disabled in production');
      assert.equal((await call('/bootstrap')).status, 401, 'production dashboard data requires a configured account session');
    } finally {
      process.env.NODE_ENV = previousMode;
    }
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
