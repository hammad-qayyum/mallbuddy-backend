import { z } from "zod";

export const createPaymentMethodSchema = z.object({
  paymentMethodId: z.string(), // pm_xxx from Stripe
});

export const setDefaultSchema = z.object({
    id: z.string().uuid("Invalid payment method ID"),
});
