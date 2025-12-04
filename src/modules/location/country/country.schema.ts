import { z } from "zod";

// 1) Schema for creating a new country
export const createCountrySchema = z.object({
  name: z
    .string() // must be a string
    .min(1, "Country name is required") // cannot be empty
    .max(100, "Country name must be at most 100 characters"), // prevent insane names
});

// 2) Schema for updating an existing country
export const updateCountrySchema = createCountrySchema.partial();
// .partial() means: all fields become optional
// so the client can send only { name: "New Name" } if they want to

// 3) Types inferred from schemas for TypeScript
export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>;
