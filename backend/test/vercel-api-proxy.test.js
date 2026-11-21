import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('Vercel proxies same-origin API requests to the existing Render API before the SPA fallback', async () => {
  const config = JSON.parse(await readFile(path.join(projectRoot, 'vercel.json'), 'utf8'));
  assert.deepEqual(config.rewrites[0], {
    source: '/api/:path*',
    destination: 'https://school-transportation-coordination-system.onrender.com/api/:path*'
  });
  assert.equal(config.rewrites.at(-1).destination, '/index.html');
});
