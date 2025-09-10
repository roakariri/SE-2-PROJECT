/**
 * Serverless endpoint to create a PayMongo payment_intent.
 * - Expects the client to POST the same JSON you would send to
 *   https://api.paymongo.com/v1/payment_intents
 * - The PayMongo secret key must be provided via the PAYMONGO_SECRET
 *   environment variable (do NOT commit the secret to the repo).
 *
 * Deploy: this file works as a Vercel serverless function (or any Node host
 * that supports the `export default` handler signature). Locally you must
 * set PAYMONGO_SECRET in your environment before running the dev server.
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
    // PayMongo requires HTTP Basic auth with the secret key as the username
    const auth = 'Basic ' + Buffer.from(`${secret}:`).toString('base64');

    const resp = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify(req.body)
    });

    const data = await resp.json();
    // Mirror PayMongo's status and body back to the client for the frontend to handle
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error('PayMongo proxy error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
