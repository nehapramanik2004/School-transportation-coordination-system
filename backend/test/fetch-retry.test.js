import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry } from '../../frontend/src/services/fetchWithRetry.js';

test('transient network failures and Render gateway responses retry once', async () => {
  for (const firstFailure of [new TypeError('temporary connection failure'), new Response('', { status: 503 })]) {
    let calls = 0;
    const response = await fetchWithRetry(async () => {
      calls += 1;
      if (calls === 1) {
        if (firstFailure instanceof Error) throw firstFailure;
        return firstFailure;
      }
      return new Response('ok', { status: 200 });
    }, '/api/bootstrap', {}, { delay: async () => {} });
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
  }
});

test('retry exhaustion returns the last failure and does not loop forever', async () => {
  let calls = 0;
  await assert.rejects(fetchWithRetry(async () => {
    calls += 1;
    throw new TypeError('offline');
  }, '/api/bootstrap', {}, { delay: async () => {} }), /offline/);
  assert.equal(calls, 2);
});
