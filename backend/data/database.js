import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeed } from './seed.js';
import { getPool } from '../db/pool.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const databaseFile = path.join(directory, 'db.json');
const postgres = () => process.env.DATA_STORE === 'postgres';

export function ensureDatabase() {
  if (!postgres() && !fs.existsSync(databaseFile)) {
    fs.writeFileSync(databaseFile, JSON.stringify(createSeed(), null, 2), 'utf8');
  }
}

function readJson() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
}

export async function readDatabase() {
  if (!postgres()) return readJson();
  const pool = getPool();
  const [buses, drivers, routes, students, trips, attendance, alerts, settings] = await Promise.all([
    pool.query('SELECT * FROM buses ORDER BY id'), pool.query('SELECT * FROM drivers ORDER BY id'),
    pool.query('SELECT * FROM routes ORDER BY id'), pool.query('SELECT * FROM students ORDER BY id'),
    pool.query('SELECT * FROM trips ORDER BY date DESC, id'),
    pool.query('SELECT trip_id, student_id, status FROM trip_attendance'),
    pool.query('SELECT id, type, title, detail, time, read FROM alerts ORDER BY time DESC, id'),
    pool.query('SELECT key, value FROM school_settings')
  ]);
  const attendanceByTrip = new Map();
  for (const row of attendance.rows) {
    if (!attendanceByTrip.has(row.trip_id)) attendanceByTrip.set(row.trip_id, {});
    attendanceByTrip.get(row.trip_id)[row.student_id] = row.status;
  }
  const routesOut = routes.rows.map(row => ({ id: row.id, name: row.name, color: row.color, busId: row.bus_id, driverId: row.driver_id, stops: row.stops, startTime: row.start_time, duration: row.duration, status: row.status, students: 0 }));
  const routeMap = new Map(routesOut.map(row => [row.id, row]));
  const studentsOut = students.rows.map(row => ({ id: row.id, name: row.name, grade: row.grade, parent: row.parent, phone: row.phone, routeId: row.route_id, stop: row.stop, pickup: row.pickup, avatar: row.avatar, active: row.active }));
  for (const student of studentsOut) if (student.active && routeMap.has(student.routeId)) routeMap.get(student.routeId).students++;
  const driversOut = drivers.rows.map(row => ({ id: row.id, name: row.name, phone: row.phone, busId: row.bus_id, routeId: routesOut.find(route => route.driverId === row.id)?.id || null, status: row.status, avatar: row.avatar }));
  const busesOut = buses.rows.map(row => ({ id: row.id, number: row.number, label: row.label, capacity: row.capacity, status: row.status, routeId: routesOut.find(route => route.busId === row.id)?.id || null }));
  const tripsOut = trips.rows.map(row => ({ id: row.id, routeId: row.route_id, date: row.date.toISOString ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10), type: row.type, status: row.status, startedAt: row.started_at?.toISOString?.() || row.started_at || null, completedAt: row.completed_at?.toISOString?.() || row.completed_at || null, eta: row.eta, simulated: row.simulated, attendance: attendanceByTrip.get(row.id) || {} }));
  return { students: studentsOut, drivers: driversOut, buses: busesOut, routes: routesOut, trips: tripsOut, alerts: alerts.rows.map(row => ({ id: row.id, type: row.type, title: row.title, detail: row.detail, time: row.time.toISOString?.() || row.time, read: row.read })), settings: Object.fromEntries(settings.rows.map(row => [row.key, row.value])) };
}

async function persistPostgres(db) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('school-transport-api'))");
    await client.query('TRUNCATE trip_attendance, trips, students, routes, drivers, buses, alerts, school_settings');
    const bulk = async (table, fields, rows) => {
      if (rows.length) await client.query(`INSERT INTO ${table}(${fields.map(field => field[0]).join(',')}) SELECT ${fields.map((field, i) => `x.${field[0]}${field[1] ? `::${field[1]}` : ''}`).join(',')} FROM jsonb_to_recordset($1::jsonb) AS x(${fields.map(([name,type]) => `${name} ${type}`).join(',')})`, [JSON.stringify(rows)]);
    };
    await bulk('buses', [['id','text'],['number','text'],['label','text'],['capacity','integer'],['status','text']], db.buses);
    await bulk('drivers', [['id','text'],['name','text'],['phone','text'],['bus_id','text'],['status','text'],['avatar','text']], db.drivers.map(row => ({id:row.id,name:row.name,phone:row.phone,bus_id:row.busId || null,status:row.status || 'Ready',avatar:row.avatar || ''})));
    await bulk('routes', [['id','text'],['name','text'],['color','text'],['bus_id','text'],['driver_id','text'],['stops','text[]'],['start_time','text'],['duration','text'],['status','text']], db.routes.map(row => ({id:row.id,name:row.name,color:row.color,bus_id:row.busId || null,driver_id:row.driverId || null,stops:row.stops,start_time:row.startTime,duration:row.duration,status:row.status})));
    await bulk('students', [['id','text'],['name','text'],['grade','text'],['parent','text'],['phone','text'],['route_id','text'],['stop','text'],['pickup','text'],['avatar','text'],['active','boolean']], db.students.map(row => ({id:row.id,name:row.name,grade:row.grade,parent:row.parent,phone:row.phone,route_id:row.routeId || null,stop:row.stop,pickup:row.pickup,avatar:row.avatar || '',active:row.active !== false})));
    await bulk('trips', [['id','text'],['route_id','text'],['date','date'],['type','text'],['status','text'],['started_at','timestamptz'],['completed_at','timestamptz'],['eta','text'],['simulated','boolean']], db.trips.map(row => ({id:row.id,route_id:row.routeId || null,date:row.date,type:row.type,status:row.status,started_at:row.startedAt || null,completed_at:row.completedAt || null,eta:row.eta,simulated:row.simulated !== false})));
    const attendance = db.trips.flatMap(row => Object.entries(row.attendance || {}).map(([student_id,status]) => ({trip_id:row.id,student_id,status})));
    await bulk('trip_attendance', [['trip_id','text'],['student_id','text'],['status','text']], attendance);
    await bulk('alerts', [['id','text'],['type','text'],['title','text'],['detail','text'],['time','timestamptz'],['read','boolean']], db.alerts.map(row => ({...row,detail:row.detail || '',read:row.read === true})));
    await bulk('school_settings', [['key','text'],['value','jsonb']], Object.entries(db.settings || {}).map(([key,value]) => ({key,value})));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function writeDatabase(database) {
  if (postgres()) return persistPostgres(database);
  ensureDatabase();
  const temporaryFile = `${databaseFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(database, null, 2), 'utf8');
  fs.renameSync(temporaryFile, databaseFile);
}

export async function resetDatabase() {
  return writeDatabase(createSeed());
}
