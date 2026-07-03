import { z } from "zod";

/**
 * GAP-018 — Super-Admin-only provisioning of mall admin accounts.
 */
export const createMallAdminSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  mallId: z.string().min(1, "Mall ID is required"),
  phoneNumber: z.string().optional(),
});

export type CreateMallAdminInput = z.infer<typeof createMallAdminSchema>;
