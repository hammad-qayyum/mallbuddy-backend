import { z } from "zod";

// Helper to treat empty strings from multipart/form-data as undefined for optional fields
const optionalString = (min?: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    min ? z.string().min(min).optional() : z.string().optional()
  );

// Base schema for restaurant fields (used for updates)
// Note: This is kept for updateRestaurantSchema only
const restaurantFieldsSchema = z.object({
  mallId: z.string().optional(),
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
export const updateRestaurantSchema = restaurantFieldsSchema.partial();

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

// Schema to update order status (mark as ready, for delivery, delivered, or reject)
export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  status: z.enum(["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED"], {
    message: "Invalid order status",
  }),
});

// Schema to update payment status for COD orders (disputes, corrections)
export const updatePaymentStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required").uuid("Invalid order ID"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"], {
    message: "Invalid payment status",
  }),
  reason: z
    .string()
    .max(500, "Reason cannot exceed 500 characters")
    .optional(),
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

// Schema for getting restaurant analytics
export const getRestaurantAnalyticsSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional(),
});

// Schema for getting all restaurants system-wide (public access)
export const getAllRestaurantsSystemWideSchema = z.object({
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional(),
  mallId: z.string().optional(),
  category: z.string().optional(),
});


// Schema for restaurant self-signup (creates User + Restaurant atomically)
export const restaurantSignupSchema = z.object({
  // Required fields
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Restaurant name is required"),
  location: z.string().min(1, "Address/location is required"),
  description: z.string().min(1, "Restaurant details are required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  
  // Optional fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  mallId: z.string().optional(), // Can be set later if not provided
  mainCategory: optionalString(1),
  cuisineCategoryId: optionalString(),
});

// Schema for admin creating restaurant account (creates User + Restaurant atomically)
export const adminCreateRestaurantSchema = z.object({
  // Required fields
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Restaurant name is required"),
  location: z.string().min(1, "Address/location is required"),
  description: z.string().min(1, "Restaurant details are required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  
  // Optional fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  mallId: z.string().optional(), // Can be set later if not provided
  mainCategory: optionalString(1),
  cuisineCategoryId: optionalString(),
  banner: optionalString(),
  story: optionalString(),
  isFavorite: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean())
    .optional(),
});

// TypeScript types inferred from schemas
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>;
export type DeclineOrderInput = z.infer<typeof declineOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type GetRestaurantOrdersInput = z.infer<typeof getRestaurantOrdersSchema>;
export type GetOrderDetailsInput = z.infer<typeof getOrderDetailsSchema>;
export type GetRestaurantAnalyticsInput = z.infer<typeof getRestaurantAnalyticsSchema>;
export type GetAllRestaurantsSystemWideInput = z.infer<typeof getAllRestaurantsSystemWideSchema>;
export type RestaurantSignupInput = z.infer<typeof restaurantSignupSchema>;
export type AdminCreateRestaurantInput = z.infer<typeof adminCreateRestaurantSchema>;


// =========================
// EXPLORE RESTAURANT SCHEMAS
// =========================

// Query validation for /explore endpoint
export const exploreRestaurantQuerySchema = z.object({
  mallId: z.string().optional(),               // filter by mall
  cuisineCategoryId: z.string().optional(),   // filter by cuisine
  limit: z.string().optional(),               // pagination
  page: z.string().optional(),                // pagination
});

// Params validation for /details/:restaurantId
export const restaurantDetailParamsSchema = z.object({
  restaurantId: z.string(),                   // Restaurant primary key (userId)
});

// =========================
// Explore Response Schemas
// =========================

// Each restaurant card in /explore list
export const exploreRestaurantSchema = z.object({
  userId: z.string(),
  name: z.string(),
  banner: z.string().optional(),
  isFavorite: z.boolean(),
  cuisineCategory: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

// Response for /explore/:id details
export const exploreRestaurantDetailSchema = z.object({
  userId: z.string(),
  name: z.string(),
  story: z.string().optional(),
  gallery: z.array(
    z.object({
      id: z.string(),
      imageUrl: z.string(),
    })
  ),
});

// =========================
// TypeScript types
// =========================
export type ExploreRestaurantQuery = z.infer<typeof exploreRestaurantQuerySchema>;
export type RestaurantDetailParams = z.infer<typeof restaurantDetailParamsSchema>;
export type ExploreRestaurantOutput = z.infer<typeof exploreRestaurantSchema>;
export type ExploreRestaurantDetailOutput = z.infer<typeof exploreRestaurantDetailSchema>;