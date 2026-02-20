import { z } from "zod";

// Schema for creating a menu category
export const createMenuCategorySchema = z.object({
  restaurantId: z.string(),
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be at most 50 characters"),
});

// Schema for updating a menu category
// restaurantId is excluded because it's a foreign key and shouldn't be updated
export const updateMenuCategorySchema = createMenuCategorySchema
  .omit({ restaurantId: true })
  .partial();

// Schema for creating a menu item
// image can be either a URL (string) or will be handled via file upload
export const createMenuItemSchema = z.object({
  menuCategoryId: z.string(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.preprocess(
    (value) => typeof value === "string" ? Number(value) : value,
    z.number()
  ),
  preparationTime: z.string().optional(),
  image: z.string().optional(), // Can be URL or will be set from file upload
});

// Schema for updating a menu item
// menuCategoryId is excluded because it's a foreign key and shouldn't be updated
export const updateMenuItemSchema = createMenuItemSchema
  .omit({ menuCategoryId: true })
  .partial();

// TypeScript types
export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;
export type UpdateMenuCategoryInput = z.infer<typeof updateMenuCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
