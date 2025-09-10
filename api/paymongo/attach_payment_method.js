/**
 * Serverless endpoint to attach a PayMongo payment_method to a payment_intent.
 * Body: { intent_id: string, client_key?: string, payment_method: string }
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
    const { intent_id, client_key, payment_method } = req.body || {};
    if (!intent_id || !payment_method) {
      return res.status(400).json({ error: 'intent_id and payment_method are required' });
    }
    const auth = 'Basic ' + Buffer.from(`${secret}:`).toString('base64');
    const url = `https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(intent_id)}/attach`;
    const payload = {
      data: {
        attributes: {
          payment_method,
          ...(client_key ? { client_key } : {})
        }
      }
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': auth },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error('PayMongo attach proxy error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
