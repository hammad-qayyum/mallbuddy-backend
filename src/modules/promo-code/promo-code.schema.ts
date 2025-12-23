import { z } from "zod";

// Promo code list response (for public viewing)
export const promoCodeListSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number(),
  validUntil: z.string().datetime(),
  isActive: z.boolean(),
  maxUses: z.number().nullable(),
  usedCount: z.number(),
});

// Promo code validation/apply request
export const applyPromoCodeSchema = z.object({
  code: z.string().min(1, "Promo code is required").toUpperCase(),
  restaurantId: z.string().optional(),
  subtotal: z.number().positive("Subtotal must be positive"),
});

// Promo code response when applied
export const promoCodeResponseSchema = z.object({
  success: z.boolean(),
  code: z.string(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number(),
  discountAmount: z.number(),
  originalAmount: z.number(),
  finalAmount: z.number(),
  message: z.string().optional(),
});

// Admin: Create promo code
export const createPromoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").toUpperCase(),
  description: z.string().optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive("Discount value must be positive"),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUses: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  minOrderAmount: z.number().positive().optional().nullable(),
  applicableToAll: z.boolean().default(true),
  applicableRestaurantIds: z.array(z.string()).optional(), // Only if applicableToAll is false
});

// Admin: List all promo codes
export const adminPromoCodeListSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUses: z.number().nullable(),
  usedCount: z.number(),
  isActive: z.boolean(),
  minOrderAmount: z.number().nullable(),
  applicableToAll: z.boolean(),
  createdAt: z.string().datetime(),
});

export type PromoCodeList = z.infer<typeof promoCodeListSchema>;
export type ApplyPromoCodeRequest = z.infer<typeof applyPromoCodeSchema>;
export type PromoCodeResponse = z.infer<typeof promoCodeResponseSchema>;
export type CreatePromoCodeRequest = z.infer<typeof createPromoCodeSchema>;
export type AdminPromoCodeList = z.infer<typeof adminPromoCodeListSchema>;
