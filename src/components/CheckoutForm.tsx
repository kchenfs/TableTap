import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  ExpressCheckoutElement
} from '@stripe/react-stripe-js';
import { CartItem } from '../types';
import { nanoid } from 'nanoid';

interface CheckoutFormProps {
  cart: CartItem[];
  total: number;
  orderNote: string;
}

export default function CheckoutForm({ cart, total, orderNote }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // This useEffect block remains the same
  useEffect(() => { /* ... */ }, [stripe]);

  // --- 1. CREATE A REUSABLE HELPER FUNCTION ---
  // This function contains the duplicated logic for creating a Payment Intent.
  const createPaymentIntent = async (receiptEmail?: string) => {
    try {
      const paymentApiUrl = `${import.meta.env.VITE_API_GATEWAY_URL}/create-payment-intent`;
      const orderId = nanoid(5).toUpperCase();

      const res = await fetch(paymentApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          metadata: { order_id: orderId },
          // Conditionally add the email if it's provided
          ...(receiptEmail && { receipt_email: receiptEmail }),
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data.clientSecret;

    } catch (error: any) {
      setMessage(error.message || 'Failed to initialize payment.');
      setIsLoading(false);
      return null;
    }
  };

  // --- 2. UPDATE THE ORIGINAL HANDLERS TO USE THE HELPER ---
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !name || !email) return;

    setIsLoading(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setMessage(submitError.message);
      setIsLoading(false);
      return;
    }

    // Call the reusable helper function
    const clientSecret = await createPaymentIntent(email);

    if (clientSecret) {
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/completion`,
          receipt_email: email,
        },
      });
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || 'An unexpected error occurred.');
      } else {
        setMessage("An unexpected error occurred.");
      }
    }
    setIsLoading(false);
  };

  const handleExpressConfirm = async () => {
    if (!stripe || !elements) return;
    setIsLoading(true);
    
    // Call the reusable helper function
    const clientSecret = await createPaymentIntent();

    if (clientSecret) {
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/completion`,
        },
      });
      if (error) {
        setMessage(error.message || 'An unexpected error occurred.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-medium text-slate-200 mb-4">Express Checkout</h3>
      <ExpressCheckoutElement
        onConfirm={handleExpressConfirm}
        options={{
          paymentMethods: {
            googlePay: 'always',
            applePay: 'always',
            link: 'never',
          },
          emailRequired: true
        }}
      />
      
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-900 px-2 text-sm text-slate-400">Or pay with</span>
        </div>
      </div>

      <form id="payment-form" onSubmit={handleManualSubmit}>
        <h3 className="text-lg font-medium text-slate-200 mb-4">Payment Details</h3>
        <PaymentElement id="payment-element" />

        <h3 className="text-lg font-medium text-slate-200 mt-6 mb-4">Contact Info</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full rounded-lg border-0 bg-slate-800 py-2.5 px-4 text-sm text-slate-50 ring-1 ring-slate-100/10 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-500 transition"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email Address for Receipt
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-lg border-0 bg-slate-800 py-2.5 px-4 text-sm text-slate-50 ring-1 ring-slate-100/10 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-500 transition"
              placeholder="jane.doe@example.com"
            />
          </div>
        </div>

        <button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          className="w-full mt-6 rounded-lg bg-slate-200 py-3 font-semibold text-slate-900 disabled:opacity-50 transition-colors hover:bg-white"
        >
          <span id="button-text">
            {isLoading ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </span>
        </button>
        {message && <div id="payment-message" className="text-center text-red-400 mt-4 text-sm">{message}</div>}
      </form>
    </div>
  );
}