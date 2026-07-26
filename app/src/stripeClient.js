import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripeEnabled = Boolean(publishableKey);
export const stripePromise = stripeEnabled ? loadStripe(publishableKey) : null;
