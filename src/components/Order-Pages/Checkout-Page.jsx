import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const [payLoading, setPayLoading] = useState(false);
    // Dev payment interface state
    const [amount, setAmount] = useState(2000); // centavos
    const [descriptor, setDescriptor] = useState('ryan butalid');
    const [name, setName] = useState('John Doe');
    const [email, setEmail] = useState('john@example.com');
    const [phone, setPhone] = useState('639171234567');
    const [cardNumber, setCardNumber] = useState('4343434343434345'); // PayMongo test card
    const [expMonth, setExpMonth] = useState(12);
    const [expYear, setExpYear] = useState(30);
    const [cvc, setCvc] = useState('123');

    const [intentData, setIntentData] = useState(null);
    const [paymentMethodData, setPaymentMethodData] = useState(null);
    const [attachData, setAttachData] = useState(null);

    // Trigger PayMongo checkout creation on the server and redirect to the hosted checkout
    const handlePayWithPayMongo = async () => {
        setPayLoading(true);
        try {
            // NOTE: The client should NOT call PayMongo directly with secret keys.
            // Instead POST this PayMongo payment_intent body to a server endpoint which
            // will forward it to https://api.paymongo.com/v1/payment_intents with the
            // Authorization header (Basic <base64(secret_key:)>).
            // Replace `amount` with your order total in centavos.
            // If running on localhost use the local proxy (or VITE_PAYMONGO_PROXY if provided)
            const localProxy = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? (import.meta.env.VITE_PAYMONGO_PROXY || 'http://localhost:8787')
                : '';
            const apiBase = localProxy ? `${localProxy}/api/paymongo` : '/api/paymongo';
            const endpoint = `${apiBase}/create_payment_intent`;

            // Log the endpoint so it's visible in the browser console when debugging
            console.debug('PayMongo endpoint', endpoint);
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            amount: Number(amount) || 0,
                            payment_method_allowed: ['qrph', 'card', 'dob', 'paymaya', 'billease', 'gcash', 'grab_pay'],
                            payment_method_options: { card: { request_three_d_secure: 'any' } },
                            currency: 'PHP',
                            capture_type: 'automatic',
                            statement_descriptor: descriptor
                        }
                    }
                })
            });

            // Guard against non-JSON or empty responses (common when an endpoint is missing or returns HTML)
            let data = null;
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await resp.json();
                } catch (parseErr) {
                    console.error('Failed to parse JSON from PayMongo proxy', parseErr);
                    const txt = await resp.text().catch(() => '<<no body>>');
                    throw new Error(`Invalid JSON response (status ${resp.status}): ${txt}`);
                }
            } else {
                // Not JSON — read text for debugging and throw a helpful error
                const txt = await resp.text().catch(() => '<<no body>>');
                console.debug('PayMongo proxy non-JSON response', resp.status, txt);
                if (resp.status === 404) {
                    throw new Error('PayMongo proxy not found (404). If you are running the Vite dev server locally, note that Vite does not serve /api/ serverless functions — either deploy to Vercel or run the local proxy (see README.paymongo.md).');
                }
                throw new Error(`Unexpected response from PayMongo proxy (status ${resp.status}): ${txt}`);
            }

            console.debug('Create payment_intent response', data);
            setIntentData(data);
            // The server should return the PayMongo response; depending on your flow you may
            // need to create a payment source/client-side action or redirect to a hosted
            // payment page. If the server returns a `checkout_url` or `url`, redirect there.
            // Case 1: payment_intent successfully created (no redirect expected yet)
            if (resp.ok && data?.data?.type === 'payment_intent') {
                const s = data?.data?.attributes?.status;
                const ck = data?.data?.attributes?.client_key;
                console.info('Payment intent created:', s, ck);
                alert(`Payment intent created. Status: ${s}`);
                return;
            }
            if (resp.ok && data?.checkout_url) {
                window.location.href = data.checkout_url;
                return;
            }
            if (data?.data?.attributes?.next_action?.redirect?.url) {
                window.location.href = data.data.attributes.next_action.redirect.url;
                return;
            }
            if (data?.url) { window.location.href = data.url; return; }
            if (data?.redirect_url) { window.location.href = data.redirect_url; return; }
            console.error('PayMongo create payment_intent failed', data);
            alert('Payment creation failed. See console for details.');
        } catch (err) {
            console.error('PayMongo payment error', err);
            // Provide a user-friendly message for the common 404/local-dev case
            alert(err.message || 'Payment error. See console.');
        } finally {
            setPayLoading(false);
        }
    };

    // Dev: create a payment_method (card) using server endpoint
    const handleCreatePaymentMethod = async () => {
        setPayLoading(true);
        try {
            const localProxy = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? (import.meta.env.VITE_PAYMONGO_PROXY || 'http://localhost:8787')
                : '';
            const apiBase = localProxy ? `${localProxy}/api/paymongo` : '/api/paymongo';
            const endpoint = `${apiBase}/create_payment_method`;
            console.debug('Create payment_method endpoint', endpoint);
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            type: 'card',
                            details: {
                                card_number: cardNumber,
                                exp_month: Number(expMonth),
                                exp_year: Number(expYear),
                                cvc
                            },
                            billing: { name, email, phone }
                        }
                    }
                })
            });
            const data = await resp.json().catch(() => null);
            console.debug('Create payment_method response', data);
            setPaymentMethodData(data);
            if (!resp.ok) alert('Failed to create payment method');
        } catch (err) {
            console.error('PayMongo create payment method error', err);
            alert(err.message || 'Payment method error');
        } finally {
            setPayLoading(false);
        }
    };

    // Dev: attach payment_method to payment_intent
    const handleAttachPaymentMethod = async () => {
        setPayLoading(true);
        try {
            const intentId = intentData?.data?.id;
            const clientKey = intentData?.data?.attributes?.client_key;
            const paymentMethodId = paymentMethodData?.data?.id;
            if (!intentId || !paymentMethodId) {
                alert('Create intent and payment method first');
                return;
            }
            const localProxy = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? (import.meta.env.VITE_PAYMONGO_PROXY || 'http://localhost:8787')
                : '';
            const apiBase = localProxy ? `${localProxy}/api/paymongo` : '/api/paymongo';
            const endpoint = `${apiBase}/attach_payment_method`;
            console.debug('Attach payment_method endpoint', endpoint);
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ intent_id: intentId, client_key: clientKey, payment_method: paymentMethodId })
            });
            const data = await resp.json().catch(() => null);
            console.debug('Attach payment_method response', data);
            setAttachData(data);
            if (!resp.ok) alert('Failed to attach payment method');
        } catch (err) {
            console.error('PayMongo attach error', err);
            alert(err.message || 'Attach error');
        } finally {
            setPayLoading(false);
        }
    };
    
    return (
        <div className="fixed w-full h-full bg-cover bg-white z-50 ">
            {/* Header */}
            <div className="w-full h-15 bg-white border border-b border-b-[#171738]">
                <div className="w-full p-4">
                    <div className="w-full flex items-center justify-between">
                        {/* Logo */}
                        <div className="phone:w-full phone:h-10 tablet:h-15 laptop:h-20 bigscreen:h-20 flex justify-start items-center w-full px-4">
                            <img
                            src="/logo-icon/logo.png"
                            className="object-contain w-[120px] h-[32px] phone:w-[100px] phone:h-[28px] tablet:w-[140px] tablet:h-[40px] laptop:w-[220px] laptop:h-[80px] bigscreen:w-[220px] bigscreen:h-[80px] cursor-pointer"
                            alt="Logo"
                            onClick={() => navigate("/HomePage")}
                            />
                        </div>

                        {/* Right icon (cart/profile) */}
                        <div className="flex items-center pr-4">
                            <button
                                aria-label="Open cart"
                                onClick={() => navigate('/account?tab=orders')}
                                className="p-2 rounded-md  w-[40px] h-[40px] flex items-center justify-center focus:outline-none bg-white hover:bg-gray-200"
                            >
                                <img src="/logo-icon/shopping-bag.svg" alt="Project icon" className="w-[40px] h-[40px] object-contain bg-transparent" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <div className="min-h-screen px-[100px] py-[30px] w-full flex flex-col bg-white ">
                <div className="mt-2">
                    <p className="text-black font-bold text-[36px] font-dm-sans">Checkout</p>
                    <div className="mt-4">
                        <button
                            onClick={handlePayWithPayMongo}
                            disabled={payLoading}
                            className="px-4 py-2 bg-[#0F172A] text-white rounded-md hover:opacity-90"
                        >
                            {payLoading ? 'Processing…' : 'Pay with PayMongo'}
                        </button>
                        <p className="text-sm text-gray-500 mt-2">You will be redirected to PayMongo to complete payment.</p>
                    </div>

                    {/* Dev Interface: create intent -> create payment method -> attach */}
                    <div className="mt-8 p-4 border rounded-lg bg-gray-50">
                        <p className="font-semibold mb-2">Payment (Dev Interface)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="flex flex-col text-sm">Amount (centavos)
                                <input className="border p-2 rounded" value={amount} onChange={e => setAmount(e.target.value)} />
                            </label>
                            <label className="flex flex-col text-sm">Statement descriptor
                                <input className="border p-2 rounded" value={descriptor} onChange={e => setDescriptor(e.target.value)} />
                            </label>
                            <label className="flex flex-col text-sm">Name
                                <input className="border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
                            </label>
                            <label className="flex flex-col text-sm">Email
                                <input className="border p-2 rounded" value={email} onChange={e => setEmail(e.target.value)} />
                            </label>
                            <label className="flex flex-col text-sm">Phone
                                <input className="border p-2 rounded" value={phone} onChange={e => setPhone(e.target.value)} />
                            </label>
                            <div className="col-span-1 md:col-span-2 font-medium">Card (test)</div>
                            <label className="flex flex-col text-sm">Card number
                                <input className="border p-2 rounded" value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="flex flex-col text-sm">Exp Month
                                    <input className="border p-2 rounded" value={expMonth} onChange={e => setExpMonth(e.target.value)} />
                                </label>
                                <label className="flex flex-col text-sm">Exp Year
                                    <input className="border p-2 rounded" value={expYear} onChange={e => setExpYear(e.target.value)} />
                                </label>
                                <label className="flex flex-col text-sm">CVC
                                    <input className="border p-2 rounded" value={cvc} onChange={e => setCvc(e.target.value)} />
                                </label>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={handlePayWithPayMongo} disabled={payLoading} className="px-3 py-2 bg-slate-800 text-white rounded">Create intent</button>
                            <button onClick={handleCreatePaymentMethod} disabled={payLoading} className="px-3 py-2 bg-slate-600 text-white rounded">Create payment method</button>
                            <button onClick={handleAttachPaymentMethod} disabled={payLoading} className="px-3 py-2 bg-slate-500 text-white rounded">Attach to intent</button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <pre className="border rounded p-2 overflow-auto bg-white"><b>intent</b> {JSON.stringify(intentData, null, 2)}</pre>
                            <pre className="border rounded p-2 overflow-auto bg-white"><b>payment_method</b> {JSON.stringify(paymentMethodData, null, 2)}</pre>
                            <pre className="border rounded p-2 overflow-auto bg-white"><b>attach</b> {JSON.stringify(attachData, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage;