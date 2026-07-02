import { Request, Response } from "express";
import { favouriteMenuItemService } from "./favourite-menu-item.service";
import { favouriteMenuItemSchema } from "./favourite-menu-item.schema";
import { getAuthUserId } from "../common/utils";

function requireAuthUserId(req: Request, res: Response): string | null {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return userId;
}

export const favouriteMenuItemController = {
  // GET /favourite-menu-items - List favourite menu items (full detail)
  async getFavourites(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const favourites = await favouriteMenuItemService.listFavourites(userId);
      return res.json(favourites);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /favourite-menu-items/ids - List favourited menu-item IDs (lightweight)
  async getFavouriteIds(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const ids = await favouriteMenuItemService.listFavouriteIds(userId);
      return res.json({ menuItemIds: ids });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /favourite-menu-items/toggle - Toggle a favourite
  async toggleFavourite(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const parseResult = favouriteMenuItemSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const result = await favouriteMenuItemService.toggleFavourite(
        userId,
        parseResult.data.menuItemId
      );
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /favourite-menu-items - Add a favourite
  async addFavourite(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const parseResult = favouriteMenuItemSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const result = await favouriteMenuItemService.addFavourite(
        userId,
        parseResult.data.menuItemId
      );
      return res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // DELETE /favourite-menu-items/:menuItemId - Remove a favourite
  async removeFavourite(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;
      const { menuItemId } = req.params;

      if (!menuItemId) {
        return res.status(400).json({ message: "menuItemId is required" });
      }

      const result = await favouriteMenuItemService.removeFavourite(
        userId,
        menuItemId
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
