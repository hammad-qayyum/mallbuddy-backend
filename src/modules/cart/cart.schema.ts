import { z } from "zod";

// Schema to add/create item in cart
export const addToCartSchema = z.object({
  userId: z.string().min(1),
  menuItemId: z.string().min(1),
  restaurantId: z.string().min(1, "Invalid restaurant ID"),
  quantity: z.number().int().min(1).positive("Quantity must be at least 1").default(1),
  specialNotes: z.string().optional(),
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
