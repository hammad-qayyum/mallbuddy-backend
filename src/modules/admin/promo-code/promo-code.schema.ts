import { z } from "zod";

// Admin: Create promo code
export const createPromoCodeSchema = z.object({
  mallId: z.string().min(1, "Mall is required"),
  restaurantId: z.string().min(1, "Restaurant is required"),
  code: z.string().min(3, "Code must be at least 3 characters"),
  discountPercentage: z.number().min(0).max(100, "Discount percentage must be between 0 and 100"),
  endDate: z.string().min(1, "End date is required").refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    },
    { message: "End date must be a valid date" }
  ),
  // startDate is auto-generated on the server
});

// Admin: Update promo code
export const updatePromoCodeSchema = z.object({
  mallId: z.string().optional(),
  restaurantId: z.string().optional(),
  code: z.string().min(3, "Code must be at least 3 characters").optional(),
  discountPercentage: z.number().min(0).max(100, "Discount percentage must be between 0 and 100").optional(),
  endDate: z.string().min(1).refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    },
    { message: "End date must be a valid date" }
  ).optional(),
  // startDate cannot be updated
});

export type CreatePromoCodeRequest = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeRequest = z.infer<typeof updatePromoCodeSchema>;
