/**
 * Create a PayPal order
 * POST /api/paypal/create_order
 * Body: { amount: number|string, currency?: string, shippingAddress?: {
 *   name?: { full_name?: string },
 *   address: {
 *     address_line_1: string,
 *     address_line_2?: string,
 *     admin_area_2: string, // city
 *     admin_area_1: string, // province/region
 *     postal_code: string,
 *     country_code: string
 *   }
 * } }
 * Returns: { id: string, raw: any }
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
    const accessToken = await getAccessToken();
    const base = getPaypalBaseUrl();
  const { amount, currency, shippingAddress } = req.body || {};
    const currency_code = (currency || 'PHP').toUpperCase();

    // Accept either centavos (number) or decimal string/number
    let value;
    if (typeof amount === 'number') {
      // If looks like centavos (e.g., 2000), convert to decimal string
      value = amount > 100 ? (amount / 100).toFixed(2) : amount.toFixed(2);
    } else if (typeof amount === 'string') {
      // Assume already decimal string
      value = amount;
    } else {
      // Default for testing
      value = '20.00';
    }

    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code,
            value
          },
        }
      ],
    };
    // If a shipping address was provided, include it and force PayPal to use it
    if (shippingAddress && shippingAddress.address) {
      body.application_context = { shipping_preference: 'SET_PROVIDED_ADDRESS' };
      body.purchase_units[0].shipping = shippingAddress;
    }

    const resp = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Failed to create order', details: data });
    }
    return res.status(200).json({ id: data.id, raw: data });
  } catch (err) {
    console.error('PayPal create_order error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
