import Stripe from "stripe";
import env from "dotenv";
env.config();
// Initialize Stripe once and reuse it everywhere
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});
