import { z } from "zod";

// Schema for mall analytics
export const getMallAnalyticsSchema = z.object({
  mallId: z.string().min(1, "Mall ID is required"),
  period: z.enum(["today", "week", "month", "year", "all"]).default("all").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Schema for restaurant sales summary
export const getRestaurantSalesSummarySchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  period: z.enum(["today", "week", "month", "year", "all"]).default("all").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Schema for promoCode details
export const getPromoCodeDetailsSchema = z.object({
  promoCodeId: z.string().min(1, "PromoCode ID is required"),
});

// Schema for promoCode usage over time
export const getPromoCodeUsageOverTimeSchema = z.object({
  promoCodeId: z.string().min(1, "PromoCode ID is required"),
  period: z.enum(["week", "month", "year"]).default("month").optional(),
});

// Schema for promoCode orders with pagination
export const getPromoCodeOrdersSchema = z.object({
  promoCodeId: z.string().min(1, "PromoCode ID is required"),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional(),
});

// Schema for getting all restaurants system-wide
export const getAllRestaurantsSystemWideSchema = z.object({
    page: z.number().int().positive().default(1).optional(),
    limit: z.number().int().positive().max(100).default(10).optional(),
    mallId: z.string().optional(),
    category: z.string().optional(),
  });
  

// TypeScript types
export type GetMallAnalyticsInput = z.infer<typeof getMallAnalyticsSchema>;
export type GetRestaurantSalesSummaryInput = z.infer<typeof getRestaurantSalesSummarySchema>;
export type GetPromoCodeDetailsInput = z.infer<typeof getPromoCodeDetailsSchema>;
export type GetPromoCodeUsageOverTimeInput = z.infer<typeof getPromoCodeUsageOverTimeSchema>;
export type GetPromoCodeOrdersInput = z.infer<typeof getPromoCodeOrdersSchema>;
export type GetAllRestaurantsSystemWideInput = z.infer<typeof getAllRestaurantsSystemWideSchema>;
