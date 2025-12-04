import { z } from "zod";

// Schema to create a new restaurant
export const createRestaurantSchema = z.object({
  userId: z.string(),
  banner: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  mallId: z.string(),
  mainCategory: z.string(),
});

// Schema to update an existing restaurant
// userId is excluded because it's the primary key and shouldn't be updated
export const updateRestaurantSchema = createRestaurantSchema
  .omit({ userId: true })
  .partial();

// TypeScript types inferred from schemas
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
