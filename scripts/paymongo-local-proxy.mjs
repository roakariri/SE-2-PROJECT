// Minimal local proxy for PayMongo using Node's built-in http and global fetch.
// Run:
//   PAYMONGO_SECRET=sk_test_xxx node scripts/paymongo-local-proxy.mjs
// Or via npm script: npm run paymongo-proxy

import http from 'http';

const PORT = process.env.PAYMONGO_PROXY_PORT || 8787;
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;

if (!PAYMONGO_SECRET) {
  console.error('Missing PAYMONGO_SECRET in env');
  process.exit(1);
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  if (req.url === '/__health') {
    return sendJSON(res, 200, { ok: true });
  }

  if (req.url === '/api/paymongo/create_payment_intent' && req.method === 'POST') {
    try {
      // Read request body as JSON (limit ~1MB)
      let raw = '';
      let tooLarge = false;
      req.on('data', chunk => {
        raw += chunk;
        if (raw.length > 1_000_000) tooLarge = true;
      });
      req.on('end', async () => {
        if (tooLarge) return sendJSON(res, 413, { error: 'Payload too large' });
        let json;
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch (e) {
          return sendJSON(res, 400, { error: 'Invalid JSON' });
        }

        const auth = 'Basic ' + Buffer.from(`${PAYMONGO_SECRET}:`).toString('base64');
        const pmResp = await fetch('https://api.paymongo.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': auth
          },
          body: JSON.stringify(json)
        });
        const data = await pmResp.json().catch(() => ({ error: 'Invalid JSON from PayMongo' }));
        return sendJSON(res, pmResp.ok ? 200 : pmResp.status, data);
      });
    } catch (err) {
      console.error('Proxy error', err);
      return sendJSON(res, 500, { error: err.message || 'Unknown error' });
    }
    return;
  }

  if (req.url === '/api/paymongo/create_payment_method' && req.method === 'POST') {
    try {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', async () => {
        let json;
        try { json = raw ? JSON.parse(raw) : {}; } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
        const auth = 'Basic ' + Buffer.from(`${PAYMONGO_SECRET}:`).toString('base64');
        const pmResp = await fetch('https://api.paymongo.com/v1/payment_methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': auth },
          body: JSON.stringify(json)
        });
        const data = await pmResp.json().catch(() => ({ error: 'Invalid JSON from PayMongo' }));
        return sendJSON(res, pmResp.ok ? 200 : pmResp.status, data);
      });
    } catch (err) {
      console.error('Proxy error', err);
      return sendJSON(res, 500, { error: err.message || 'Unknown error' });
    }
    return;
  }

  if (req.url.startsWith('/api/paymongo/attach_payment_method') && req.method === 'POST') {
    try {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', async () => {
        let json;
        try { json = raw ? JSON.parse(raw) : {}; } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
        const { intent_id, client_key, payment_method } = json || {};
        if (!intent_id || !payment_method) return sendJSON(res, 400, { error: 'intent_id and payment_method required' });
        const auth = 'Basic ' + Buffer.from(`${PAYMONGO_SECRET}:`).toString('base64');
        const url = `https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(intent_id)}/attach`;
        const payload = { data: { attributes: { payment_method, ...(client_key ? { client_key } : {}) } } };
        const pmResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': auth },
          body: JSON.stringify(payload)
        });
        const data = await pmResp.json().catch(() => ({ error: 'Invalid JSON from PayMongo' }));
        return sendJSON(res, pmResp.ok ? 200 : pmResp.status, data);
      });
    } catch (err) {
      console.error('Proxy error', err);
      return sendJSON(res, 500, { error: err.message || 'Unknown error' });
    }
    return;
  }

  // Not found
  sendJSON(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`PayMongo local proxy listening at http://localhost:${PORT}`);
});
