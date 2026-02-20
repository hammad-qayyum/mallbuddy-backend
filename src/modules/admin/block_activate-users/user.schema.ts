import { z } from "zod";

export const setUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'BLOCKED']),
  reason: z.string().optional(),
  actionById: z.string().uuid().optional(),
});

export const searchUsersAdminSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['USER', 'RESTAURANT_OWNER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export const searchOrdersAdminSchema = z.object({
  orderNumber: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']).optional(),
  userId: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
export type SearchUsersAdminInput = z.infer<typeof searchUsersAdminSchema>;
export type SearchOrdersAdminInput = z.infer<typeof searchOrdersAdminSchema>;
