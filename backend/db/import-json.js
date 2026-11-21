import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { assertTestingBranch, expectedTestBranch } from './branch-guard.js';
import { writeDatabase, readDatabase } from '../data/database.js';
import { closePool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../');
dotenv.config({ path: path.join(root, '.env.local'), override: true, quiet: true });
process.env.DATA_STORE = 'postgres';
assertTestingBranch();
const file = path.join(root, 'backend/data/db.json');
const input = JSON.parse(await fs.readFile(file, 'utf8'));
if (!Array.isArray(input.students) || !Array.isArray(input.routes) || !Array.isArray(input.trips)) {
  throw new Error('JSON import source is missing required application collections.');
}
const routeIds = new Set(input.routes.map(row => row.id));
const busIds = new Set(input.buses.map(row => row.id));
const driverIds = new Set(input.drivers.map(row => row.id));
for (const student of input.students) if (student.routeId && !routeIds.has(student.routeId)) throw new Error(`Student ${student.id} references missing route ${student.routeId}.`);
for (const route of input.routes) {
  if (route.busId && !busIds.has(route.busId)) throw new Error(`Route ${route.id} references missing bus ${route.busId}.`);
  if (route.driverId && !driverIds.has(route.driverId)) throw new Error(`Route ${route.id} references missing driver ${route.driverId}.`);
}
for (const trip of input.trips) for (const studentId of Object.keys(trip.attendance || {})) {
  if (!input.students.some(student => student.id === studentId)) throw new Error(`Trip ${trip.id} attendance references missing student ${studentId}.`);
}

// Route assignment is canonical. Old JSON snapshots can retain stale reverse routeId fields.
input.buses.forEach(bus => { bus.routeId = input.routes.find(route => route.busId === bus.id)?.id || null; });
input.drivers.forEach(driver => { driver.routeId = input.routes.find(route => route.driverId === driver.id)?.id || null; });
input.routes.forEach(route => { route.students = input.students.filter(student => student.active !== false && student.routeId === route.id).length; });
await writeDatabase(input);
const result = await readDatabase();
const counts = Object.fromEntries(['students','drivers','buses','routes','trips','alerts'].map(key => [key, result[key].length]));
console.log(JSON.stringify({ branch: expectedTestBranch().name, importedFrom: 'backend/data/db.json', counts, jsonFileUnchanged: true }, null, 2));
await closePool();
