import { z } from "zod";

// Helper function to parse DD/MM/YYYY date format
const parseDateString = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split("/").map(Number);
  if (!day || !month || !year) {
    throw new Error("Invalid date format. Expected DD/MM/YYYY");
  }
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    throw new Error("Invalid date");
  }
  return date;
};

// Schema for creating a promotion
export const createPromotionSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  title: z
    .string()
    .min(6, "Title must be at least 6 characters")
    .max(100, "Title must be at most 100 characters"),
  discountPercentage: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number().min(0, "Discount percentage must be at least 0").max(100, "Discount percentage cannot exceed 100")
  ),
  startDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Start date must be in DD/MM/YYYY format")
    .transform((val) => parseDateString(val)),
  endDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "End date must be in DD/MM/YYYY format")
    .transform((val) => parseDateString(val)),
  banner: z.string().optional(), // Will be set from file upload
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  }
);

// Schema for updating a promotion
export const updatePromotionSchema = z.object({
  title: z
    .string()
    .min(6, "Title must be at least 6 characters")
    .max(100, "Title must be at most 100 characters")
    .optional(),
  discountPercentage: z.preprocess(
    (val) => (typeof val === "string" ? Number(val) : val),
    z.number().min(0, "Discount percentage must be at least 0").max(100, "Discount percentage cannot exceed 100")
  ).optional(),
  startDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Start date must be in DD/MM/YYYY format")
    .transform((val) => parseDateString(val))
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "End date must be in DD/MM/YYYY format")
    .transform((val) => parseDateString(val))
    .optional(),
  banner: z.string().optional(),
  isActive: z.preprocess(
    (val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    },
    z.boolean()
  ).optional(),
}).refine(
  (data) => {
    // Only validate if both dates are provided
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  }
);

// TypeScript types
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

