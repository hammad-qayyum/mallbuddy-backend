import { z } from "zod";

// Schema for tracking order
export const trackOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
});

// TypeScript types
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
