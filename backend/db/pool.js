import pg from 'pg';
import { assertTestingBranch } from './branch-guard.js';

const { Pool } = pg;
let pool;

export function getPool() {
  assertTestingBranch();
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'school-transport-api-test'
    });
    pool.on('error', error => console.error('Idle PostgreSQL client error:', error.message));
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    const activePool = pool;
    pool = undefined;
    await activePool.end();
  }
}
