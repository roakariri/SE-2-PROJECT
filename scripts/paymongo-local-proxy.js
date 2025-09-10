// Small Express proxy to test PayMongo endpoint locally when your dev server
// (Vite) does not mount /api/ serverless routes.
// Usage: node scripts/paymongo-local-proxy.js
// Requires: npm install express node-fetch

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const app = express();
app.use(express.json());

const PORT = process.env.PAYMONGO_PROXY_PORT || 8787;
const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;
if (!PAYMONGO_SECRET) {
  console.error('Missing PAYMONGO_SECRET in env');
  process.exit(1);
}

app.post('/api/paymongo/create_payment_intent', async (req, res) => {
  try {
    const auth = 'Basic ' + Buffer.from(`${PAYMONGO_SECRET}:`).toString('base64');
    const resp = await fetch('https://api.paymongo.com/v1/payment_intents', {
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

app.listen(PORT, () => console.log(`PayMongo local proxy listening at http://localhost:${PORT}`));
