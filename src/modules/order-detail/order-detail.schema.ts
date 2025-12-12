import { z } from "zod";

// Schema for getting order details
export const orderDetailSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

// TypeScript types
export type OrderDetailInput = z.infer<typeof orderDetailSchema>;
