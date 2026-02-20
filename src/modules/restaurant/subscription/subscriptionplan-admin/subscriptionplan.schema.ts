import { z } from "zod";

// Schema for creating a subscription plan
export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  price: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number().min(0, "Price must be at least 0")
  ),
  interval: z.enum(["MONTHLY", "YEARLY"], {
    message: "Interval must be either MONTHLY or YEARLY",
  }),
  features: z.any().optional(), // JSON object for features
});

// Schema for updating a subscription plan
export const updateSubscriptionPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters").optional(),
  features: z.any().optional(), // JSON object for features
});

// TypeScript types
export type CreateSubscriptionPlanInput = z.infer<typeof createSubscriptionPlanSchema>;
export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;

