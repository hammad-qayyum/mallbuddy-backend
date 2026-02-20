import { z } from "zod";

// Time slot schema (supports multiple slots per day)
export const timeSlotSchema = z.object({
  slotType: z.enum(["OPEN", "BREAK"]),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:mm (e.g., 09:00)"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:mm (e.g., 22:00)"),
});

export const businessDaySchema = z.object({
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  isClosed: z.boolean().default(false),
  timeSlots: z.array(timeSlotSchema).optional(),
});

// Create/Update Restaurant Info Schema
export const restaurantInfoSchema = z.object({
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  estimatedDeliveryTime: z.string().optional().nullable(),
});

// Business Hours Create/Update Schema (array of days)
export const createBusinessHoursSchema = z.array(businessDaySchema);

// For updating a day: partial fields allowed and timeSlots optional
export const updateBusinessHoursSchema = z.object({
  isClosed: z.boolean().optional(),
  timeSlots: z.array(timeSlotSchema).optional(),
}).partial();

// Response Schemas
export const restaurantInfoResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  profileImage: z.string().nullable(),
  address: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  estimatedDeliveryTime: z.string().nullable(),
  businessHours: z.array(businessDaySchema),
  banner: z.string().nullable(),
  description: z.string().nullable(),
});

export type TimeSlotInput = z.infer<typeof timeSlotSchema>;
export type BusinessDayInput = z.infer<typeof businessDaySchema>;
export type RestaurantInfoInput = z.infer<typeof restaurantInfoSchema>;
export type CreateBusinessHoursInput = z.infer<typeof createBusinessHoursSchema>;
export type UpdateBusinessHoursInput = z.infer<typeof updateBusinessHoursSchema>;
export type RestaurantInfoResponse = z.infer<typeof restaurantInfoResponseSchema>;
