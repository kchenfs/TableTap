import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import { CartItem } from '../types';
import { nanoid } from 'nanoid'; // <-- Import nanoid

interface CheckoutFormProps {
  cart: CartItem[];
  total: number;
  orderNote: string;
}

export default function CheckoutForm({ cart, total, orderNote }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    // **MODIFIED**: Generate a 5-character alphanumeric ID using nanoid.
    const orderId = nanoid(5).toUpperCase();

    // Step 1: Create the PaymentIntent on your server
    let clientSecret;
    try {
      const paymentApiUrl = `${import.meta.env.VITE_API_GATEWAY_URL}/create-payment-intent`;
      const res = await fetch(paymentApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: cart,
            metadata: { order_id: orderId }
        }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      clientSecret = data.clientSecret;
    } catch (error: any) {
        setMessage(error.message || 'Failed to initialize payment.');
        setIsLoading(false);
        return;
    }

    const addressElement = elements.getElement('address');
    const addressValue = await addressElement?.getValue();
    const receiptEmail = addressValue?.value.email;

    // Step 2: Confirm the payment
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/completion`,
        receipt_email: receiptEmail,
      },
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message || 'An unexpected error occurred.');
    } else {
      setMessage("An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="p-6">
      <h3 className="text-lg font-medium text-slate-200 mb-4">Contact & Billing</h3>
      <AddressElement options={{mode: 'billing'}} />
      <h3 className="text-lg font-medium text-slate-200 mt-6 mb-4">Payment</h3>
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
      <button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        className="w-full mt-6 rounded-lg bg-slate-200 py-3 font-semibold text-slate-900 disabled:opacity-50"
      >
        <span id="button-text">
          {isLoading ? "Processing..." : `Pay $${total.toFixed(2)}`}
        </span>
      </button>
      {message && <div id="payment-message" className="text-center text-red-400 mt-4">{message}</div>}
    </form>
  );
}