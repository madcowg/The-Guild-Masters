import React, { forwardRef, useImperativeHandle } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripeEnabled, stripePromise } from "../stripeClient.js";

// Tokenizes a card via Stripe.js without needing a PaymentIntent yet --
// none exists at posting-creation time; it's only created later, inside
// quest-review, at steward-approval time. CardElement + createPaymentMethod
// detaches tokenization from PaymentIntent creation, which is exactly the
// timing this app needs.
const CardFieldInner = forwardRef(function CardFieldInner(_props, ref) {
  let stripe = useStripe(),
    elements = useElements();

  useImperativeHandle(ref, () => ({
    tokenize: async () => {
      if (!stripe || !elements) {
        return { error: "Payment form has not finished loading yet." };
      }
      let card = elements.getElement(CardElement);
      let { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card,
      });
      if (error) return { error: error.message };
      return { paymentMethodId: paymentMethod.id };
    },
  }));

  return (
    <div className="form-row">
      <span className="form-label">Card (test mode)</span>
      <div className="field wood-field">
        <CardElement
          options={{
            style: {
              base: { fontSize: "16px", color: "#3A1408" },
            },
          }}
        />
      </div>
    </div>
  );
});

// Owns the <Elements> boundary so App.jsx never imports Stripe Elements
// primitives directly. Renders nothing if VITE_STRIPE_PUBLISHABLE_KEY is
// unset -- same "step aside entirely" contract as supabaseClient.js, so
// the standalone demo build stays untouched.
export const PostContractPaymentField = forwardRef(function PostContractPaymentField(_props, ref) {
  if (!stripeEnabled) return null;
  return (
    <Elements stripe={stripePromise}>
      <CardFieldInner ref={ref} />
    </Elements>
  );
});
