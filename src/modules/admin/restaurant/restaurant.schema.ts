import { z } from "zod";

export const setBlockStatusSchema = z.object({
  restaurantId: z.string().uuid(),
  isBlocked: z.boolean(),
  reason: z.string().optional(),
  actionById: z.string().uuid().optional(),
});

export const setApprovalStatusSchema = z.object({
  restaurantId: z.string().uuid(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reason: z.string().optional(),
  actionById: z.string().uuid().optional(),
});

export const searchRestaurantsAdminSchema = z.object({
  name: z.string().optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isBlocked: z.boolean().optional(),
  mallId: z.string().uuid().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export type SetBlockStatusInput = z.infer<typeof setBlockStatusSchema>;
export type SetApprovalStatusInput = z.infer<typeof setApprovalStatusSchema>;
export type SearchRestaurantsAdminInput = z.infer<typeof searchRestaurantsAdminSchema>;
