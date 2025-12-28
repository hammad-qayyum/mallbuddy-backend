import { z } from "zod";

// Schema for getting user's orders with filters
export const getUserOrdersSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  status: z
    .enum(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"])
    .optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
});

// Schema for getting active orders (excludes DELIVERED and CANCELLED)
export const getActiveOrdersSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
});

// Schema for getting past orders (DELIVERED or CANCELLED)
export const getPastOrdersSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
});

// Schema for cancelling an order with reason
export const cancelOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  userId: z.string().min(1, "User ID is required"),
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters").max(500, "Reason cannot exceed 500 characters"),
});

// Schema for reordering items from a past order
export const reorderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  userId: z.string().min(1, "User ID is required"),
});

// Schema for order cancellation reasons lookup
export const cancellationReasonsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// Schema for getting order details
export const getOrderDetailsSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

// Schema for getting order summary
export const getOrderSummarySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

// Schema for getting accepted orders (order queue) for restaurant
export const getAcceptedOrdersSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  limit: z.number().int().positive().default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

// TypeScript types
export type GetUserOrdersInput = z.infer<typeof getUserOrdersSchema>;
export type GetActiveOrdersInput = z.infer<typeof getActiveOrdersSchema>;
export type GetPastOrdersInput = z.infer<typeof getPastOrdersSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type CancellationReasonsInput = z.infer<typeof cancellationReasonsSchema>;
export type GetOrderDetailsInput = z.infer<typeof getOrderDetailsSchema>;
export type GetOrderSummaryInput = z.infer<typeof getOrderSummarySchema>;
export type GetAcceptedOrdersInput = z.infer<typeof getAcceptedOrdersSchema>;
