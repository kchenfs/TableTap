import React, { useState, useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function Completion() {
  const stripe = useStripe();
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Retrieve the client secret from the URL query string
    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) {
      return;
    }

    // Retrieve the PaymentIntent to check its final status
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      setStatus(paymentIntent?.status || null);
      switch (paymentIntent?.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  return (
     <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg text-center max-w-sm w-full">
        {status === 'succeeded' ? (
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
        ) : (
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        )}
        <h1 className="text-2xl font-bold text-slate-100">{message || 'Loading...'}</h1>
        <a href="/" className="mt-6 inline-block text-sky-400 hover:text-sky-300">
          Back to Menu
        </a>
      </div>
    </div>
  );
}