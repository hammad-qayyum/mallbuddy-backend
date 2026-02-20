import { z } from "zod";

// Schema to create a new favourite cart
export const createFavouriteCartSchema = z.object({
  name: z.string().min(1, "Favourite cart name is required").max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  copyFromCurrentCart: z.boolean().optional().default(true), // If true, copy items from current cart; if false, create empty favourite cart
});

// Schema to add item to favourite cart
export const addToFavouriteCartSchema = z.object({
  menuItemId: z.string().min(1),
  restaurantId: z.string().min(1, "Invalid restaurant ID"),
  quantity: z.number().int().min(1),
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

// Schema to update favourite cart item
export const updateFavouriteCartItemSchema = z.object({
  quantity: z.number().int().positive("Quantity must be at least 1").optional(),
  specialNotes: z.string().optional().nullable(),
});

// Schema to update favourite cart (name and description)
export const updateFavouriteCartSchema = z.object({
  name: z.string().min(1, "Favourite cart name is required").max(100, "Name cannot exceed 100 characters").optional(),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
});

// Schema to restore favourite cart to current cart
export const restoreFavouriteCartSchema = z.object({
  replaceCurrent: z.boolean().optional().default(false), // If true, clear current cart; if false, add to current cart
});

// TypeScript types inferred from schemas
export type CreateFavouriteCartInput = z.infer<typeof createFavouriteCartSchema>;
export type AddToFavouriteCartInput = z.infer<typeof addToFavouriteCartSchema>;
export type UpdateFavouriteCartItemInput = z.infer<typeof updateFavouriteCartItemSchema>;
export type UpdateFavouriteCartInput = z.infer<typeof updateFavouriteCartSchema>;
export type RestoreFavouriteCartInput = z.infer<typeof restoreFavouriteCartSchema>;
