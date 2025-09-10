import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const [payLoading, setPayLoading] = useState(false);

    // Trigger PayMongo checkout creation on the server and redirect to the hosted checkout
    const handlePayWithPayMongo = async () => {
        setPayLoading(true);
        try {
            // NOTE: The client should NOT call PayMongo directly with secret keys.
            // Instead POST this PayMongo payment_intent body to a server endpoint which
            // will forward it to https://api.paymongo.com/v1/payment_intents with the
            // Authorization header (Basic <base64(secret_key:)>).
            // Replace `amount` with your order total in centavos.
            const resp = await fetch('/api/paymongo/create_payment_intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            amount: 2000,
                            payment_method_allowed: ['qrph', 'card', 'dob', 'paymaya', 'billease', 'gcash', 'grab_pay'],
                            payment_method_options: { card: { request_three_d_secure: 'any' } },
                            currency: 'PHP',
                            capture_type: 'automatic'
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
            // The server should return the PayMongo response; depending on your flow you may
            // need to create a payment source/client-side action or redirect to a hosted
            // payment page. If the server returns a `checkout_url` or `url`, redirect there.
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
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage;