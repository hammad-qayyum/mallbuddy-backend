import { z } from "zod";

// Create
export const createCitySchema = z.object({
  name: z
    .string()
    .min(1, "City name is required")
    .max(100, "City name too long"),
  countryId: z
    .string()
    .uuid("Invalid country ID"),
});

// Update
export const updateCitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  countryId: z.string().uuid().optional(),
});

// Types
export type CreateCityInput = z.infer<typeof createCitySchema>;
export type UpdateCityInput = z.infer<typeof updateCitySchema>;
