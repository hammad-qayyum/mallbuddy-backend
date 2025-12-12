import { z } from "zod";

// Helper to treat empty strings from multipart/form-data as undefined for optional fields
const optionalString = (min?: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    min ? z.string().min(min).optional() : z.string().optional()
  );

// Schema to create a new restaurant
// Required: userId, mallId
// Optional: name, mainCategory, banner, description, story, location, cuisineCategoryId, isFavorite
export const createRestaurantSchema = z.object({
  userId: z.string(),
  mallId: z.string(),
  name: optionalString(1),
  mainCategory: optionalString(1),
  banner: optionalString(),
  description: optionalString(),
  story: optionalString(),
  location: optionalString(),
  cuisineCategoryId: optionalString(),
  // Coerce boolean coming from multipart/form-data ("true"/"false")
  isFavorite: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean())
    .optional(),
});

// Schema to update an existing restaurant
// userId is excluded because it's the primary key and shouldn't be updated
export const updateRestaurantSchema = createRestaurantSchema
  .omit({ userId: true })
  .partial();

// TypeScript types inferred from schemas
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
