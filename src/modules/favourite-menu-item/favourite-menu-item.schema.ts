import { z } from "zod";

// Schema to add / remove / toggle a favourite menu item
export const favouriteMenuItemSchema = z.object({
  menuItemId: z.string().min(1, "menuItemId is required"),
});

export type FavouriteMenuItemInput = z.infer<typeof favouriteMenuItemSchema>;
