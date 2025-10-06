PayMongo server proxy

This project includes a small serverless proxy for creating PayMongo payment_intents.

Files added:
- api/paymongo/create_payment_intent.js - serverless endpoint that forwards the incoming JSON to PayMongo using the `PAYMONGO_SECRET` environment variable.
- .env.example - shows the PAYMONGO_SECRET variable name.
- scripts/paymongo-local-proxy.js - optional express proxy for local development when your dev server does not expose `api/` routes.

Quick local run (Vite dev server + Node env):
1. Copy `.env.example` to `.env` at the project root and set your secret key:

   PAYMONGO_SECRET=sk_test_your_secret_here

2a. If your dev host supports serverless `api/` (Vercel), just set `PAYMONGO_SECRET` and deploy.

2b. If you run locally with Vite (which doesn't serve `/api/` by default), run the local proxy:

   # install dependencies once
   npm install express node-fetch

   # run the proxy in one terminal (it will listen on http://localhost:8787)
   PAYMONGO_SECRET=sk_test_your_secret_here node scripts/paymongo-local-proxy.js

   # In another terminal run your Vite dev server as usual (npm run dev)

3. To use the local proxy during dev, either:
   - Start the proxy on the same origin as your Vite server via a rewrite or proxy rule, or
   - Update the frontend fetch URL in `src/components/Order-Pages/Checkout-Page.jsx` from
     `/api/paymongo/create_payment_intent` to `http://localhost:8787/api/paymongo/create_payment_intent` while developing locally.

Deployment:
- On Vercel, the file `api/paymongo/create_payment_intent.js` will be automatically deployed as a serverless function. Set `PAYMONGO_SECRET` in the Vercel project environment variables.

Security:
- Never commit your secret key. Keep it in environment variables only.
