import { z } from "zod";

// 1) Schema for creating a new mall
export const createMallSchema = z.object({
  name: z
    .string()
    .min(1, "Mall name is required")
    .max(150, "Mall name must be at most 150 characters"),
  address: z
    .string()
    .max(255, "Address too long")
    .optional(),
  cityId: z
    .string()
    .min(1, "cityId is required"), // you’re using String UUIDs
});

// 2) Schema for updating an existing mall
export const updateMallSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  address: z.string().max(255).optional(),
  cityId: z.string().min(1).optional(),
});

// Schema for getting mall statistics
export const getMallStatisticsSchema = z.object({
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().max(100).default(10).optional(),
});

// 3) Types inferred from schemas
export type CreateMallInput = z.infer<typeof createMallSchema>;
export type UpdateMallInput = z.infer<typeof updateMallSchema>;
export type GetMallStatisticsInput = z.infer<typeof getMallStatisticsSchema>;
