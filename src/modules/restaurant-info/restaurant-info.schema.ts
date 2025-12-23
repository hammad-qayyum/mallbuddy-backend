import { z } from "zod";

// Business Hours Schema
export const businessHoursSchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:mm (e.g., 09:00)"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:mm (e.g., 22:00)"),
  isClosed: z.boolean().default(false),
});

// Create/Update Restaurant Info Schema
export const restaurantInfoSchema = z.object({
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  estimatedDeliveryTime: z.string().optional().nullable(),
});

// Business Hours Create/Update Schema
export const createBusinessHoursSchema = z.array(businessHoursSchema);

export const updateBusinessHoursSchema = businessHoursSchema.omit({ dayOfWeek: true }).partial();

// Response Schemas
export const restaurantInfoResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  profileImage: z.string().nullable(),
  address: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  estimatedDeliveryTime: z.string().nullable(),
  businessHours: z.array(businessHoursSchema),
  banner: z.string().nullable(),
  description: z.string().nullable(),
});

export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;
export type RestaurantInfoInput = z.infer<typeof restaurantInfoSchema>;
export type CreateBusinessHoursInput = z.infer<typeof createBusinessHoursSchema>;
export type UpdateBusinessHoursInput = z.infer<typeof updateBusinessHoursSchema>;
export type RestaurantInfoResponse = z.infer<typeof restaurantInfoResponseSchema>;
