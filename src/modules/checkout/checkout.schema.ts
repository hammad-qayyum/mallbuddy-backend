import { z } from "zod";

// Schema for checkout request
export const checkoutSchema = z.object({
  // Accept non-UUID user IDs (BetterAuth style)
  userId: z.string().min(1, "User ID is required"),
  deliveryAddressId: z.string().min(1, "Delivery address ID is required").uuid("Invalid address ID"),
  paymentMethod: z.enum(["CASH", "CARD", "WALLET", "ONLINE"], {
    message: "Invalid payment method",
  }),
  specialInstructions: z.string().optional().nullable(),
  promoCodeId: z.string().optional(), // Optional promo code ID
  deliveryFee: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
});

// Schema for updating order status
export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"], {
    message: "Invalid order status",
  }),
  estimatedDeliveryTime: z.string().optional(),
});

// Schema for getting order details
export const getOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
});

// Schema for getting user orders
export const getUserOrdersSchema = z.object({
  // Accept non-UUID user IDs (BetterAuth style)
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
});

// TypeScript types
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type GetOrderInput = z.infer<typeof getOrderSchema>;
export type GetUserOrdersInput = z.infer<typeof getUserOrdersSchema>;
