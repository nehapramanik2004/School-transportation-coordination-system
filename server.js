const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const seed = {
  students: [
    { id: 'stu-1', name: 'Aarav Mehta', grade: 'Grade 4 · A', parent: 'Priya Mehta', phone: '+91 98765 43210', routeId: 'route-1', stop: 'Lakeview Apartments', pickup: '7:35 AM', avatar: 'AM', active: true },
    { id: 'stu-2', name: 'Anaya Kapoor', grade: 'Grade 2 · B', parent: 'Rohan Kapoor', phone: '+91 98765 43211', routeId: 'route-1', stop: 'Maple Street', pickup: '7:42 AM', avatar: 'AK', active: true },
    { id: 'stu-3', name: 'Ishaan Sharma', grade: 'Grade 6 · A', parent: 'Neha Sharma', phone: '+91 98765 43212', routeId: 'route-2', stop: 'Green Park Gate', pickup: '7:30 AM', avatar: 'IS', active: true },
    { id: 'stu-4', name: 'Diya Nair', grade: 'Grade 3 · C', parent: 'Arjun Nair', phone: '+91 98765 43213', routeId: 'route-2', stop: 'Orchid Residency', pickup: '7:48 AM', avatar: 'DN', active: true },
    { id: 'stu-5', name: 'Kabir Rao', grade: 'Grade 5 · B', parent: 'Meera Rao', phone: '+91 98765 43214', routeId: 'route-3', stop: 'Cedar Lane', pickup: '7:40 AM', avatar: 'KR', active: true },
    { id: 'stu-6', name: 'Mira Joshi', grade: 'Grade 1 · A', parent: 'Amit Joshi', phone: '+91 98765 43215', routeId: 'route-3', stop: 'Sunrise Enclave', pickup: '7:52 AM', avatar: 'MJ', active: true }
  ],
  drivers: [
    { id: 'drv-1', name: 'Rajesh Kumar', phone: '+91 98100 11223', busId: 'bus-1', routeId: 'route-1', status: 'On route', avatar: 'RK' },
    { id: 'drv-2', name: 'Suresh Patel', phone: '+91 98100 11224', busId: 'bus-2', routeId: 'route-2', status: 'On route', avatar: 'SP' },
    { id: 'drv-3', name: 'Vikram Singh', phone: '+91 98100 11225', busId: 'bus-3', routeId: 'route-3', status: 'Ready', avatar: 'VS' }
  ],
  buses: [
    { id: 'bus-1', number: 'DL 1C AB 2486', label: 'Bus 01', capacity: 32, status: 'On route', routeId: 'route-1' },
    { id: 'bus-2', number: 'DL 1C AB 7312', label: 'Bus 02', capacity: 28, status: 'On route', routeId: 'route-2' },
    { id: 'bus-3', number: 'DL 1C AB 9154', label: 'Bus 03', capacity: 32, status: 'Ready', routeId: 'route-3' },
    { id: 'bus-4', number: 'DL 1C AB 4068', label: 'Bus 04', capacity: 24, status: 'Ready', routeId: null }
  ],
  routes: [
    { id: 'route-1', name: 'Lakeview Loop', color: 'blue', busId: 'bus-1', driverId: 'drv-1', stops: ['Lakeview Apartments', 'Maple Street', 'Riverside Market', 'Northview School'], students: 2, startTime: '7:15 AM', duration: '42 min', status: 'Active' },
    { id: 'route-2', name: 'Green Park Express', color: 'purple', busId: 'bus-2', driverId: 'drv-2', stops: ['Green Park Gate', 'Orchid Residency', 'City Library', 'Northview School'], students: 2, startTime: '7:10 AM', duration: '38 min', status: 'Active' },
    { id: 'route-3', name: 'Cedar Grove Route', color: 'orange', busId: 'bus-3', driverId: 'drv-3', stops: ['Cedar Lane', 'Sunrise Enclave', 'Oakwood Circle', 'Northview School'], students: 2, startTime: '7:20 AM', duration: '45 min', status: 'Active' }
  ],
  trips: [
    { id: 'trip-1', routeId: 'route-1', date: new Date().toISOString().slice(0, 10), type: 'Morning pickup', status: 'In progress', startedAt: new Date(Date.now() - 17 * 60000).toISOString(), eta: '8:18 AM', attendance: { 'stu-1': 'Picked up', 'stu-2': 'Upcoming' }, simulated: true },
    { id: 'trip-2', routeId: 'route-2', date: new Date().toISOString().slice(0, 10), type: 'Morning pickup', status: 'In progress', startedAt: new Date(Date.now() - 12 * 60000).toISOString(), eta: '8:22 AM', attendance: { 'stu-3': 'Picked up', 'stu-4': 'Upcoming' }, simulated: true },
    { id: 'trip-3', routeId: 'route-3', date: new Date().toISOString().slice(0, 10), type: 'Morning pickup', status: 'Scheduled', startedAt: null, eta: '8:30 AM', attendance: { 'stu-5': 'Upcoming', 'stu-6': 'Upcoming' }, simulated: true },
    { id: 'trip-4', routeId: 'route-1', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), type: 'Afternoon drop', status: 'Completed', startedAt: new Date(Date.now() - 86400000 + 9 * 3600000).toISOString(), eta: '3:42 PM', attendance: { 'stu-1': 'Dropped off', 'stu-2': 'Dropped off' }, simulated: true }
  ],
  alerts: [
    { id: 'alert-1', type: 'Pickup', title: 'Aarav was picked up', detail: 'Lakeview Apartments · Bus 01', time: new Date(Date.now() - 5 * 60000).toISOString(), read: false },
    { id: 'alert-2', type: 'Info', title: 'Bus 02 is on its way', detail: 'Green Park Express · ETA 8:22 AM', time: new Date(Date.now() - 11 * 60000).toISOString(), read: false },
    { id: 'alert-3', type: 'Drop', title: 'Yesterday’s trip completed', detail: 'Aarav arrived at Lakeview Apartments', time: new Date(Date.now() - 18 * 3600000).toISOString(), read: true }
  ],
  settings: { schoolName: 'Northview Academy', demoMode: true }
};

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
function readDb() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(JSON.stringify(data)); }
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 1e6) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON body')); } }); }); }
function id(prefix) { return `${prefix}-${randomUUID().slice(0, 8)}`; }
function routeName(db, routeId) { return db.routes.find(x => x.id === routeId)?.name || 'Unassigned'; }

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] === 'api') {
      const db = readDb();
      if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, storage: 'local JSON file', demoMode: true });
      if (req.method === 'GET' && url.pathname === '/api/bootstrap') return send(res, 200, db);
      if (req.method === 'GET' && url.pathname === '/api/summary') return send(res, 200, {
        totalStudents: db.students.filter(s => s.active).length,
        totalBuses: db.buses.length,
        activeRoutes: db.routes.filter(r => r.status === 'Active').length,
        todaysTrips: db.trips.filter(t => t.date === new Date().toISOString().slice(0, 10)).length,
        tripsInProgress: db.trips.filter(t => t.status === 'In progress').length,
        unreadAlerts: db.alerts.filter(a => !a.read).length
      });
      if (req.method === 'POST' && parts[1] === 'students') {
        const data = await body(req); const student = { id: id('stu'), ...data, avatar: data.name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(), active: true };
        db.students.push(student); writeDb(db); return send(res, 201, student);
      }
      if (req.method === 'POST' && parts[1] === 'drivers') {
        const data = await body(req); const driver = { id: id('drv'), ...data, avatar: data.name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase(), status: 'Ready' };
        db.drivers.push(driver); writeDb(db); return send(res, 201, driver);
      }
      if (req.method === 'POST' && parts[1] === 'routes') {
        const data = await body(req); const route = { id: id('route'), ...data, stops: data.stops.split(',').map(s => s.trim()).filter(Boolean), students: 0, status: 'Active' };
        db.routes.push(route); writeDb(db); return send(res, 201, route);
      }
      if (req.method === 'POST' && parts[1] === 'trips') {
        const data = await body(req); const students = db.students.filter(s => s.routeId === data.routeId);
        const trip = { id: id('trip'), ...data, status: 'Scheduled', startedAt: null, attendance: Object.fromEntries(students.map(s => [s.id, 'Upcoming'])), simulated: true };
        db.trips.unshift(trip); writeDb(db); return send(res, 201, trip);
      }
      if (req.method === 'POST' && parts[1] === 'alerts') {
        const data = await body(req); const alert = { id: id('alert'), type: data.type || 'Emergency', title: data.title, detail: data.detail || '', time: new Date().toISOString(), read: false };
        db.alerts.unshift(alert); writeDb(db); return send(res, 201, alert);
      }
      if (req.method === 'PATCH' && parts[1] === 'alerts' && parts[2] === 'read') {
        db.alerts.forEach(a => { a.read = true; }); writeDb(db); return send(res, 200, { ok: true });
      }
      if (req.method === 'PATCH' && parts[1] === 'trips' && parts[3] === 'status') {
        const trip = db.trips.find(t => t.id === parts[2]); if (!trip) return send(res, 404, { error: 'Trip not found' });
        const data = await body(req); trip.status = data.status;
        if (data.status === 'In progress' && !trip.startedAt) trip.startedAt = new Date().toISOString();
        if (data.status === 'Completed') trip.completedAt = new Date().toISOString();
        const route = db.routes.find(r => r.id === trip.routeId); const bus = route && db.buses.find(b => b.id === route.busId);
        if (bus) bus.status = data.status === 'In progress' ? 'On route' : data.status === 'Completed' ? 'Ready' : bus.status;
        const driver = route && db.drivers.find(d => d.id === route.driverId); if (driver && data.status === 'Completed') driver.status = 'Ready'; else if (driver && data.status === 'In progress') driver.status = 'On route';
        writeDb(db); return send(res, 200, trip);
      }
      if (req.method === 'PATCH' && parts[1] === 'trips' && parts[3] === 'attendance') {
        const trip = db.trips.find(t => t.id === parts[2]); if (!trip) return send(res, 404, { error: 'Trip not found' });
        const data = await body(req); const student = db.students.find(s => s.id === data.studentId); if (!student) return send(res, 404, { error: 'Student not found' });
        trip.attendance[data.studentId] = data.status;
        const isDrop = data.status === 'Dropped off';
        db.alerts.unshift({ id: id('alert'), type: isDrop ? 'Drop' : 'Pickup', title: `${student.name} ${isDrop ? 'was dropped off' : 'was picked up'}`, detail: `${student.stop} · ${db.buses.find(b => b.id === db.routes.find(r => r.id === trip.routeId)?.busId)?.label || 'School bus'}`, time: new Date().toISOString(), read: false });
        writeDb(db); return send(res, 200, trip);
      }
      if (req.method === 'DELETE' && parts[1] === 'students' && parts[2]) {
        const i = db.students.findIndex(s => s.id === parts[2]); if (i < 0) return send(res, 404, { error: 'Student not found' }); db.students.splice(i, 1); writeDb(db); return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'API endpoint not found' });
    }
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(PUBLIC_DIR, `.${requested}`);
    if (!file.startsWith(PUBLIC_DIR + path.sep) && file !== path.join(PUBLIC_DIR, 'index.html')) return send(res, 403, { error: 'Forbidden' });
    fs.readFile(file, (err, contents) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(file); const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); res.end(contents);
    });
  } catch (error) { send(res, 400, { error: error.message || 'Request failed' }); }
});

server.listen(PORT, () => console.log(`Northview Transport is ready at http://localhost:${PORT}`));
