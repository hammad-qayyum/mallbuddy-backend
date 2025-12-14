import { z } from "zod";

// Schema to add/create item in cart
export const addToCartSchema = z.object({
  userId: z.string().min(1),
  menuItemId: z.string().min(1),
  restaurantId: z.string().min(1, "Invalid restaurant ID"),
  quantity: z.number().int().min(1).positive("Quantity must be at least 1").default(1),
  specialNotes: z.string().optional(),
  // Selected variations: array of {variationId, selectedOptionId}
  selectedVariations: z
    .array(
      z.object({
        variationId: z.string().min(1, "Variation ID is required"),
        selectedOptionId: z.string().min(1, "Selected option ID is required"),
      })
    )
    .optional(),
  // Selected add-ons: array of {addOnId, selectedOptionIds[]}
  selectedAddOns: z
    .array(
      z.object({
        addOnId: z.string().min(1, "Add-on ID is required"),
        selectedOptionIds: z.array(z.string().min(1, "Option ID is required")),
      })
    )
    .optional(),
});

// Schema to update cart item quantity and notes
export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive("Quantity must be at least 1").optional(),
  specialNotes: z.string().optional().nullable(),
});

// Schema to remove item from cart
export const removeFromCartSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
});

// TypeScript types inferred from schemas
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type AddToCartServiceInput = Omit<AddToCartInput, "userId">;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
