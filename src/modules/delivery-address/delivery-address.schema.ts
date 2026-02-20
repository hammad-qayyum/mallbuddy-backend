import { z } from "zod";

// Schema to create a new delivery address
export const createDeliveryAddressSchema = z.object({
  label: z.string().max(100, "Label cannot exceed 100 characters").optional(),
  address: z.string().min(1, "Address is required").max(500, "Address cannot exceed 500 characters"),
  city: z.string().max(100, "City cannot exceed 100 characters").optional(),
  postalCode: z.string().max(20, "Postal code cannot exceed 20 characters").optional(),
  isDefault: z.boolean().optional().default(false),
});

// Schema to update a delivery address
export const updateDeliveryAddressSchema = z.object({
  label: z.string().max(100, "Label cannot exceed 100 characters").optional(),
  address: z.string().min(1, "Address is required").max(500, "Address cannot exceed 500 characters").optional(),
  city: z.string().max(100, "City cannot exceed 100 characters").optional().nullable(),
  postalCode: z.string().max(20, "Postal code cannot exceed 20 characters").optional().nullable(),
  isDefault: z.boolean().optional(),
});

// TypeScript types inferred from schemas
export type CreateDeliveryAddressInput = z.infer<typeof createDeliveryAddressSchema>;
export type UpdateDeliveryAddressInput = z.infer<typeof updateDeliveryAddressSchema>;

