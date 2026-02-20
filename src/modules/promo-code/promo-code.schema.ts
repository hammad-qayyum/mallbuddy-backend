import { z } from "zod";

// Promo code validation/apply request
export const applyPromoCodeSchema = z.object({
  code: z.string().min(1, "Promo code is required").toUpperCase(),
  restaurantId: z.string().optional(),
});

// Promo code response when applied
export const promoCodeResponseSchema = z.object({
  success: z.boolean(),
  promoCodeId: z.string().optional(),
  code: z.string().optional(),
  discountPercentage: z.number().optional(),
  // No amounts calculated here; checkout calculates using discountPercentage
  message: z.string().optional(),
});

export type ApplyPromoCodeRequest = z.infer<typeof applyPromoCodeSchema>;
export type PromoCodeResponse = z.infer<typeof promoCodeResponseSchema>;
