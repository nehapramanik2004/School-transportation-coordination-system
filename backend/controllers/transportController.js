import { randomUUID } from 'node:crypto';
import { readDatabase, writeDatabase } from '../data/database.js';
import { HttpError } from '../middleware/errors.js';
import { normalizeDemoTripDates, schoolDateKey } from '../utils/schoolDate.js';

const makeId = prefix => `${prefix}-${randomUUID().slice(0, 8)}`;
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const find = (items, id, label) => {
  const value = items.find(item => item.id === id);
  if (!value) throw new HttpError(404, `${label} not found`);
  return value;
};
const recalculateStudents = db => db.routes.forEach(route => { route.students = db.students.filter(student => student.routeId === route.id && student.active).length; });

export async function bootstrap(req, res) {
  const db = await readDatabase();
  recalculateStudents(db);
  res.json(scopeWorkspace(normalizeDemoTripDates(db), req.user));
}

function scopeWorkspace(db, user) {
  if (!user || user.role === 'admin') return db;
  if (user.role === 'parent') {
    const student = db.students.find(item => item.id === user.studentId);
    const route = student && db.routes.find(item => item.id === student.routeId);
    const routes = route ? [route] : [];
    const drivers = route ? db.drivers.filter(item => item.id === route.driverId || item.id === user.driverId) : [];
    const buses = route ? db.buses.filter(item => item.id === route.busId) : [];
    const firstName = student?.name.trim().split(/\s+/)[0].toLowerCase();
    return {
      students: student ? [student] : [], drivers, buses, routes,
      trips: route ? db.trips.filter(item => item.routeId === route.id) : [],
      alerts: firstName ? db.alerts.filter(item => item.title.toLowerCase().includes(firstName)) : [],
      settings: db.settings
    };
  }
  if (user.role === 'driver') {
    const driver = db.drivers.find(item => item.id === user.driverId);
    const route = db.routes.find(item => item.driverId === user.driverId) || (driver?.routeId && db.routes.find(item => item.id === driver.routeId));
    const routes = route ? [route] : [];
    const students = route ? db.students.filter(item => item.routeId === route.id) : [];
    const studentNames = students.map(item => item.name.trim().split(/\s+/)[0].toLowerCase());
    const bus = route && db.buses.find(item => item.id === route.busId);
    const alerts = db.alerts.filter(alert => alert.type === 'Emergency' || alert.type === 'Delay'
      || studentNames.some(name => alert.title.toLowerCase().includes(name))
      || Boolean(bus && alert.detail.toLowerCase().includes(bus.label.toLowerCase())));
    return {
      students, drivers: driver ? [driver] : [], buses: bus ? [bus] : [], routes,
      trips: route ? db.trips.filter(item => item.routeId === route.id) : [], alerts,
      settings: db.settings
    };
  }
  return { students: [], drivers: [], buses: [], routes: [], trips: [], alerts: [], settings: db.settings };
}

function assertDriverOwnsTrip(db, user, trip) {
  if (user?.role !== 'driver') return;
  const route = db.routes.find(item => item.id === trip.routeId);
  const assigned = route && (route.driverId === user.driverId || db.drivers.some(driver => driver.id === user.driverId && driver.routeId === route.id));
  if (!assigned) throw new HttpError(403, 'This trip is not assigned to your driver account.');
}

export async function summary(req, res) {
  const db = await readDatabase();
  const trips = normalizeDemoTripDates(db).trips;
  res.json({
    totalStudents: db.students.filter(student => student.active).length,
    totalBuses: db.buses.length,
    activeRoutes: db.routes.filter(route => route.status === 'Active').length,
    todaysTrips: trips.filter(trip => trip.date === schoolDateKey()).length,
    tripsInProgress: db.trips.filter(trip => trip.status === 'In progress').length,
    unreadAlerts: db.alerts.filter(alert => !alert.read).length
  });
}

export function list(resource) {
  return async (req, res) => {
    const db = await readDatabase();
    const workspace = resource === 'trips' ? normalizeDemoTripDates(db) : db;
    res.json(scopeWorkspace(workspace, req.user)[resource] || []);
  };
}

export async function createStudent(req, res) {
  const db = await readDatabase();
  find(db.routes, req.body.routeId, 'Route');
  const student = { id: makeId('stu'), ...req.body, avatar: initials(req.body.name), active: true };
  db.students.push(student); recalculateStudents(db); await writeDatabase(db);
  res.status(201).json(student);
}

export async function updateStudent(req, res) {
  const db = await readDatabase(); const student = find(db.students, req.params.id, 'Student');
  if (req.body.routeId) find(db.routes, req.body.routeId, 'Route');
  Object.assign(student, req.body);
  if (req.body.name) student.avatar = initials(req.body.name);
  recalculateStudents(db); await writeDatabase(db); res.json(student);
}

export async function deleteStudent(req, res) {
  const db = await readDatabase(); find(db.students, req.params.id, 'Student');
  db.students = db.students.filter(student => student.id !== req.params.id);
  db.trips.forEach(trip => { delete trip.attendance[req.params.id]; });
  recalculateStudents(db); await writeDatabase(db); res.json({ ok: true });
}

export async function createDriver(req, res) {
  const db = await readDatabase();
  if (req.body.routeId) find(db.routes, req.body.routeId, 'Route');
  if (req.body.busId) find(db.buses, req.body.busId, 'Bus');
  const driver = { id: makeId('drv'), ...req.body, avatar: initials(req.body.name), status: 'Ready' };
  db.drivers.push(driver);
  const route = db.routes.find(item => item.id === driver.routeId);
  if (route) {
    const displaced = db.drivers.find(item => item.id === route.driverId && item.id !== driver.id);
    if (displaced) displaced.routeId = null;
    route.driverId = driver.id;
    if (driver.busId) { route.busId = driver.busId; find(db.buses, driver.busId, 'Bus').routeId = route.id; }
  }
  await writeDatabase(db); res.status(201).json(driver);
}

export async function updateDriver(req, res) {
  const db = await readDatabase(); const driver = find(db.drivers, req.params.id, 'Driver');
  const previousRouteId = driver.routeId;
  if (req.body.routeId) find(db.routes, req.body.routeId, 'Route');
  if (req.body.busId) find(db.buses, req.body.busId, 'Bus');
  Object.assign(driver, req.body);
  if (req.body.name) driver.avatar = initials(req.body.name);
  if (previousRouteId && previousRouteId !== driver.routeId) {
    const previousRoute = db.routes.find(route => route.id === previousRouteId);
    if (previousRoute?.driverId === driver.id) previousRoute.driverId = null;
  }
  if (driver.routeId) {
    const route = find(db.routes, driver.routeId, 'Route');
    const displaced = db.drivers.find(item => item.id === route.driverId && item.id !== driver.id);
    if (displaced) displaced.routeId = null;
    route.driverId = driver.id;
    if (driver.busId) { route.busId = driver.busId; find(db.buses, driver.busId, 'Bus').routeId = route.id; }
  }
  await writeDatabase(db); res.json(driver);
}

export async function deleteDriver(req, res) {
  const db = await readDatabase(); find(db.drivers, req.params.id, 'Driver');
  db.drivers = db.drivers.filter(driver => driver.id !== req.params.id);
  db.routes.forEach(route => { if (route.driverId === req.params.id) route.driverId = null; });
  await writeDatabase(db); res.json({ ok: true });
}

export async function createBus(req, res) {
  const db = await readDatabase();
  const bus = { id: makeId('bus'), ...req.body, capacity: Number(req.body.capacity), status: req.body.status || 'Ready', routeId: null };
  db.buses.push(bus); await writeDatabase(db); res.status(201).json(bus);
}

export async function updateBus(req, res) {
  const db = await readDatabase(); const bus = find(db.buses, req.params.id, 'Bus');
  Object.assign(bus, req.body);
  if (req.body.capacity !== undefined) bus.capacity = Number(req.body.capacity);
  if (bus.routeId) { const route = find(db.routes, bus.routeId, 'Route'); route.busId = bus.id; }
  await writeDatabase(db); res.json(bus);
}

export async function deleteBus(req, res) {
  const db = await readDatabase(); find(db.buses, req.params.id, 'Bus');
  db.buses = db.buses.filter(bus => bus.id !== req.params.id);
  db.routes.forEach(route => { if (route.busId === req.params.id) route.busId = null; });
  db.drivers.forEach(driver => { if (driver.busId === req.params.id) driver.busId = null; });
  await writeDatabase(db); res.json({ ok: true });
}

export async function createRoute(req, res) {
  const db = await readDatabase();
  if (req.body.busId) find(db.buses, req.body.busId, 'Bus');
  if (req.body.driverId) find(db.drivers, req.body.driverId, 'Driver');
  const route = { id: makeId('route'), ...req.body, stops: req.body.stops, students: 0, status: 'Active' };
  db.routes.push(route);
  if (route.busId) { const bus = find(db.buses, route.busId, 'Bus'); bus.routeId = route.id; }
  if (route.driverId) { const driver = find(db.drivers, route.driverId, 'Driver'); driver.routeId = route.id; if (route.busId) driver.busId = route.busId; }
  await writeDatabase(db); res.status(201).json(route);
}

export async function updateRoute(req, res) {
  const db = await readDatabase(); const route = find(db.routes, req.params.id, 'Route');
  const previousBusId = route.busId;
  const previousDriverId = route.driverId;
  if (req.body.busId) find(db.buses, req.body.busId, 'Bus');
  if (req.body.driverId) find(db.drivers, req.body.driverId, 'Driver');
  Object.assign(route, req.body); recalculateStudents(db);
  if (previousBusId && previousBusId !== route.busId) {
    const previousBus = db.buses.find(bus => bus.id === previousBusId);
    if (previousBus?.routeId === route.id) previousBus.routeId = null;
  }
  if (previousDriverId && previousDriverId !== route.driverId) {
    const previousDriver = db.drivers.find(driver => driver.id === previousDriverId);
    if (previousDriver?.routeId === route.id) previousDriver.routeId = null;
  }
  if (route.busId) find(db.buses, route.busId, 'Bus').routeId = route.id;
  if (route.driverId) {
    const driver = find(db.drivers, route.driverId, 'Driver');
    const displaced = db.routes.find(item => item.id !== route.id && item.driverId === driver.id);
    if (displaced) displaced.driverId = null;
    driver.routeId = route.id;
    driver.busId = route.busId;
  }
  await writeDatabase(db); res.json(route);
}

export async function deleteRoute(req, res) {
  const db = await readDatabase(); find(db.routes, req.params.id, 'Route');
  db.routes = db.routes.filter(route => route.id !== req.params.id);
  db.students.forEach(student => { if (student.routeId === req.params.id) student.routeId = null; });
  db.drivers.forEach(driver => { if (driver.routeId === req.params.id) driver.routeId = null; });
  db.buses.forEach(bus => { if (bus.routeId === req.params.id) bus.routeId = null; });
  recalculateStudents(db); await writeDatabase(db); res.json({ ok: true });
}

export async function createTrip(req, res) {
  const db = await readDatabase(); const route = find(db.routes, req.body.routeId, 'Route');
  const attendance = Object.fromEntries(db.students.filter(student => student.routeId === route.id).map(student => [student.id, 'Upcoming']));
  const trip = { id: makeId('trip'), ...req.body, date: req.body.date || schoolDateKey(), status: 'Scheduled', startedAt: null, attendance, simulated: true };
  db.trips.unshift(trip); await writeDatabase(db); res.status(201).json(trip);
}

export async function updateTripStatus(req, res) {
  const db = await readDatabase(); const trip = find(db.trips, req.params.id, 'Trip');
  assertDriverOwnsTrip(db, req.user, trip);
  trip.status = req.body.status;
  if (trip.status === 'In progress' && !trip.startedAt) trip.startedAt = new Date().toISOString();
  if (trip.status === 'Completed') trip.completedAt = new Date().toISOString();
  const route = db.routes.find(item => item.id === trip.routeId);
  const bus = route && db.buses.find(item => item.id === route.busId);
  const driver = route && db.drivers.find(item => item.id === route.driverId);
  if (bus) bus.status = trip.status === 'In progress' ? 'On route' : trip.status === 'Completed' ? 'Ready' : bus.status;
  if (driver) driver.status = trip.status === 'In progress' ? 'On route' : trip.status === 'Completed' ? 'Ready' : driver.status;
  await writeDatabase(db); res.json(trip);
}

export async function updateAttendance(req, res) {
  const db = await readDatabase(); const trip = find(db.trips, req.params.id, 'Trip');
  assertDriverOwnsTrip(db, req.user, trip);
  const student = find(db.students, req.body.studentId, 'Student');
  if (student.routeId !== trip.routeId) throw new HttpError(400, 'Student is not assigned to this trip route');
  trip.attendance[student.id] = req.body.status;
  const route = db.routes.find(item => item.id === trip.routeId);
  const bus = route && db.buses.find(item => item.id === route.busId);
  const dropped = req.body.status === 'Dropped off';
  db.alerts.unshift({ id: makeId('alert'), type: dropped ? 'Drop' : 'Pickup', title: `${student.name} ${dropped ? 'was dropped off' : 'was picked up'}`, detail: `${student.stop} Â· ${bus?.label || 'School bus'}`, time: new Date().toISOString(), read: false });
  await writeDatabase(db); res.json(trip);
}

export async function createAlert(req, res) {
  const db = await readDatabase();
  const alert = { id: makeId('alert'), type: req.body.type, title: req.body.title, detail: req.body.detail || '', time: new Date().toISOString(), read: false };
  db.alerts.unshift(alert); await writeDatabase(db); res.status(201).json(alert);
}

export async function markAlertsRead(req, res) {
  const db = await readDatabase(); db.alerts.forEach(alert => { alert.read = true; }); await writeDatabase(db); res.json({ ok: true });
}

