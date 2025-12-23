import { z } from "zod";

// Helper to treat empty strings from multipart/form-data as undefined for optional fields
const optionalString = (min?: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    min ? z.string().min(min).optional() : z.string().optional()
  );

// Schema to create a new restaurant
// Required: userId, mallId
// Optional: name, mainCategory, banner, description, story, location, cuisineCategoryId, isFavorite
export const createRestaurantSchema = z.object({
  userId: z.string(),
  mallId: z.string(),
  name: optionalString(1),
  mainCategory: optionalString(1),
  banner: optionalString(),
  description: optionalString(),
  story: optionalString(),
  location: optionalString(),
  cuisineCategoryId: optionalString(),
  // Coerce boolean coming from multipart/form-data ("true"/"false")
  isFavorite: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean())
    .optional(),
});

// Schema to update an existing restaurant
// userId is excluded because it's the primary key and shouldn't be updated
export const updateRestaurantSchema = createRestaurantSchema
  .omit({ userId: true })
  .partial();

// Schema to accept an order
export const acceptOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
});

// Schema to decline an order with reason
export const declineOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  reason: z
    .string()
    .min(3, "Decline reason must be at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

// Schema to update order status (mark as ready, for delivery, delivered)
export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  status: z.enum(
    ["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"],
    { errorMap: () => ({ message: "Invalid order status" }) }
  ),
});

// Schema to get restaurant orders with filters
export const getRestaurantOrdersSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  status: z
    .enum(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"])
    .optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
});

// Schema to get single order details
export const getOrderDetailsSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
});

// TypeScript types inferred from schemas
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>;
export type DeclineOrderInput = z.infer<typeof declineOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type GetRestaurantOrdersInput = z.infer<typeof getRestaurantOrdersSchema>;
export type GetOrderDetailsInput = z.infer<typeof getOrderDetailsSchema>;
