import { z } from "zod";

// Schema for refund request validation
export const refundOrderSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  amount: z
    .number()
    .positive("Refund amount must be positive")
    .int("Refund amount must be an integer (cents)")
    .optional(),
});

export type RefundOrderInput = z.infer<typeof refundOrderSchema>;

