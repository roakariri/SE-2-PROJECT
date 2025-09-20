/**
 * Capture a PayPal order
 * POST /api/paypal/capture_order
 * Body: { orderID: string }
 */

function getPaypalBaseUrl() {
  const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  return env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_SECRET');
  }
  const base = getPaypalBaseUrl();
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const resp = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString()
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`PayPal auth failed (${resp.status}): ${txt}`);
  }
  const data = await resp.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { orderID } = req.body || {};
    if (!orderID) return res.status(400).json({ error: 'orderID is required' });

    const accessToken = await getAccessToken();
    const base = getPaypalBaseUrl();
    const resp = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Failed to capture order', details: data });
    }
    return res.status(200).json({ ok: true, raw: data });
  } catch (err) {
    console.error('PayPal capture_order error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
