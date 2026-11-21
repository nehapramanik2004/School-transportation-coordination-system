const TEST_BRANCH_NAME = 'school-transport-pg-test';
const TEST_BRANCH_ID = 'br-shiny-water-a16c95r4';
const TEST_ENDPOINT_ID = 'ep-young-paper-a16ddmsc';

export function assertTestingBranch(connectionString = process.env.DATABASE_URL) {
  if (process.env.NEON_BRANCH !== TEST_BRANCH_NAME || process.env.NEON_BRANCH_ID !== TEST_BRANCH_ID) {
    throw new Error(`Database writes are restricted to Neon testing branch ${TEST_BRANCH_NAME} (${TEST_BRANCH_ID}).`);
  }
  if (!connectionString) throw new Error('DATABASE_URL is required when DATA_STORE=postgres.');
  let hostname;
  try { hostname = new URL(connectionString).hostname; }
  catch { throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.'); }
  if (!hostname.includes(TEST_ENDPOINT_ID)) {
    throw new Error('The database URL does not belong to the approved Neon testing endpoint. Refusing database access.');
  }
}

export function expectedTestBranch() {
  return { name: TEST_BRANCH_NAME, id: TEST_BRANCH_ID, endpointId: TEST_ENDPOINT_ID };
}
