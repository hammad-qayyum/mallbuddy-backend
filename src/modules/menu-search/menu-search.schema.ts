import { z } from "zod";

export const menuSearchParamsSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  q: z.string().min(1, "Search query is required"),
});

export const menuItemSearchResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  image: z.string().nullable(),
  preparationTime: z.string().nullable(),
  category: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const menuCategorySearchResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().nullable(),
  itemCount: z.number().describe("Number of items in this category"),
});

export const menuSearchResponseSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  restaurantId: z.string(),
  restaurantName: z.string(),
  results: z.object({
    categories: z.array(menuCategorySearchResponseSchema),
    items: z.array(menuItemSearchResponseSchema),
  }),
  totalResults: z.number(),
});

export type MenuSearchParams = z.infer<typeof menuSearchParamsSchema>;
export type MenuItemSearchResponse = z.infer<typeof menuItemSearchResponseSchema>;
export type MenuCategorySearchResponse = z.infer<typeof menuCategorySearchResponseSchema>;
export type MenuSearchResponse = z.infer<typeof menuSearchResponseSchema>;
