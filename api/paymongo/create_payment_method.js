/**
 * Serverless endpoint to create a PayMongo payment_method.
 * POST the same JSON you would send to https://api.paymongo.com/v1/payment_methods
 * Secret key must be in PAYMONGO_SECRET env var.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.PAYMONGO_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Missing PAYMONGO_SECRET environment variable' });
  }

  try {
    const auth = 'Basic ' + Buffer.from(`${secret}:`).toString('base64');
    const resp = await fetch('https://api.paymongo.com/v1/payment_methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': auth,
      },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error('PayMongo payment_method proxy error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
