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
