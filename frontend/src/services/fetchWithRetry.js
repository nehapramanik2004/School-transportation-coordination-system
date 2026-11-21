const TRANSIENT_STATUSES = new Set([502, 503, 504]);

export async function fetchWithRetry(fetcher, input, options, { retries = 1, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetcher(input, options);
      if (!TRANSIENT_STATUSES.has(response.status) || attempt >= retries) return response;
    } catch (error) {
      if (attempt >= retries) throw error;
    }
    attempt += 1;
    await delay(500);
  }
}
