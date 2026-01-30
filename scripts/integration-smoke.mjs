const API_BASE = process.env.MAYA_API_BASE || 'http://localhost:3001';
const USER_ID = process.env.MAYA_USER_ID || 'smoke-test';

const headers = {
  'x-user-id': USER_ID,
};

const check = async (name, url, options = {}) => {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const text = await res.text();
    const duration = Date.now() - started;
    const payload = text
      ? (() => {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        })()
      : null;
    const ok = res.ok;
    console.log(`${ok ? '✅' : '❌'} ${name} (${res.status}) ${duration}ms`);
    if (!ok) {
      console.log('   Response:', payload);
    }
    return { ok, status: res.status, data: payload };
  } catch (error) {
    const duration = Date.now() - started;
    console.log(`❌ ${name} (error) ${duration}ms`);
    console.log('   Error:', error instanceof Error ? error.message : error);
    return { ok: false, status: 0, data: error };
  }
};

console.log('Maya Integration Smoke Test');
console.log(`API: ${API_BASE}`);
console.log(`User: ${USER_ID}`);
console.log('---');

await check('Health', `${API_BASE}/api/health`);
await check('Integrations Status', `${API_BASE}/api/integrations/status`);
await check('Integrations Health', `${API_BASE}/api/integrations/health`);
await check('Email Search', `${API_BASE}/api/email/search?query=elon`);
await check('Calendar List', `${API_BASE}/api/calendar`);
await check('Market Data', `${API_BASE}/api/market/tsla`);

console.log('---');
console.log('Smoke test complete.');
