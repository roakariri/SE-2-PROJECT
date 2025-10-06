// Small Express proxy to test PayMongo endpoint locally when your dev server
// (Vite) does not mount /api/ serverless routes.
// Usage: node scripts/paymongo-local-proxy.js
// Requires: npm install express

import express from 'express';
const app = express();
app.use(express.json());

// Simple CORS for dev: allow any origin so the browser can call this proxy from your Vite server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PAYMONGO_PROXY_PORT || 8787;
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;
if (!PAYMONGO_SECRET) {
  console.error('Missing PAYMONGO_SECRET in env');
  process.exit(1);
}

// Node 18+ provides global fetch; use it directly.
const nodeFetch = globalThis.fetch;

app.post('/api/paymongo/create_payment_intent', async (req, res) => {
  try {
    const auth = 'Basic ' + Buffer.from(`${PAYMONGO_SECRET}:`).toString('base64');
    const resp = await nodeFetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': auth },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: err.message });
  }
});

// Healthcheck
app.get('/__health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`PayMongo local proxy listening at http://localhost:${PORT}`));
