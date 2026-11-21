import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { assertTestingBranch } from './branch-guard.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../');
dotenv.config({ path: path.join(repoRoot, '.env.local'), override: true, quiet: true });
const connectionString = process.env.DATABASE_URL_UNPOOLED;
assertTestingBranch(connectionString);
const { Client } = pg;
const client = new Client({ connectionString, application_name: 'school-transport-test-migrations' });

try {
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const files = (await fs.readdir(path.join(here, 'migrations'))).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) {
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
    if (existing.rowCount) { console.log(`SKIP ${file} (already applied)`); continue; }
    const sql = await fs.readFile(path.join(here, 'migrations', file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`APPLIED ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  console.log('Migration check completed on the approved Neon testing branch.');
} finally {
  await client.end().catch(() => {});
}
