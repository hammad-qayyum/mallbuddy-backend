import { z } from "zod";

// Schema to validate creating a cuisine category
// image can be either a URL (string) or will be handled via file upload
export const createCuisineSchema = z.object({
  name: z
    .string()
    .min(2, "Cuisine name is required")
    .max(50, "Cuisine name must be at most 50 characters"),
  image: z.string().optional(), // Can be URL or will be set from file upload
});

// Schema to validate updating a cuisine category
export const updateCuisineSchema = createCuisineSchema.partial();

// TypeScript types inferred from schemas
export type UpdateCuisineInput = z.infer<typeof updateCuisineSchema>;
export type CreateCuisineInput = z.infer<typeof createCuisineSchema>;
