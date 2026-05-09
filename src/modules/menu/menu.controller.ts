import { Request, Response } from "express";
import { menuCategoryService } from "./menu.service";
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from "./menu.schema";
import { getMenuItemImageUrl } from "../../config/upload";
import { getAuthUserId, getAuthRole } from "../common/utils";
import prisma from "../../config/prisma";

/**
 * Returns the restaurantId that owns this menu category, or null if not found.
 */
async function getCategoryRestaurantId(categoryId: string): Promise<string | null> {
  const cat = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
    select: { restaurantId: true },
  });
  return cat?.restaurantId ?? null;
}

/**
 * Returns the restaurantId that owns this menu item, or null if not found.
 */
async function getItemRestaurantId(itemId: string): Promise<string | null> {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { category: { select: { restaurantId: true } } },
  });
  return item?.category?.restaurantId ?? null;
}

/**
 * Reject if the authenticated user is neither the owning restaurant nor an ADMIN.
 * Returns true if the response was already sent.
 */
function denyIfNotOwnerOrAdmin(
  req: Request,
  res: Response,
  ownerRestaurantId: string | null,
): boolean {
  if (ownerRestaurantId === null) {
    res.status(404).json({ message: "Not found" });
    return true;
  }
  const userId = getAuthUserId(req);
  const role = getAuthRole(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return true;
  }
  if (role !== "ADMIN" && userId !== ownerRestaurantId) {
    // Don't disclose existence of someone else's resource.
    res.status(404).json({ message: "Not found" });
    return true;
  }
  return false;
}

export const menuCategoryController = {
  // Menu Categories

  async createCategory(req: Request, res: Response) {
    const parseResult = createMenuCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.flatten() });
    }

    // C2 — only allow creating a category under the caller's own restaurant
    const userId = getAuthUserId(req);
    const role = getAuthRole(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (role !== "ADMIN" && parseResult.data.restaurantId !== userId) {
      return res.status(403).json({ message: "Forbidden: cannot create category for another restaurant" });
    }

    const category = await menuCategoryService.createCategory(parseResult.data);
    return res.status(201).json(category);
  },

  async getCategoriesByRestaurant(req: Request, res: Response) {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });

    const categories = await menuCategoryService.getCategoriesByRestaurant(restaurantId);
    return res.json(categories);
  },

  async updateCategory(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    const parseResult = updateMenuCategorySchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.flatten() });

    // C2 — verify ownership before mutating
    const ownerRestaurantId = await getCategoryRestaurantId(id);
    if (denyIfNotOwnerOrAdmin(req, res, ownerRestaurantId)) return;

    try {
      const category = await menuCategoryService.updateCategory(id, parseResult.data);
      return res.json(category);
    } catch (err: any) {
      return res.status(404).json({ message: "Menu category not found" });
    }
  },

  async deleteCategory(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    const ownerRestaurantId = await getCategoryRestaurantId(id);
    if (denyIfNotOwnerOrAdmin(req, res, ownerRestaurantId)) return;

    try {
      await menuCategoryService.deleteCategory(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ message: "Menu category not found" });
    }
  },

  // Menu Items

  async createItem(req: Request, res: Response) {
    const parseResult = createMenuItemSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.flatten() });

    // C2 — items live under categories that belong to a restaurant. The
    // caller must own that category's restaurant.
    const ownerRestaurantId = await getCategoryRestaurantId(parseResult.data.menuCategoryId);
    if (denyIfNotOwnerOrAdmin(req, res, ownerRestaurantId)) return;

    // If file is uploaded, use it; otherwise use URL from body if provided
    const data = { ...parseResult.data };
    if (req.file) {
      data.image = getMenuItemImageUrl(req.file.filename);
    }

    const item = await menuCategoryService.createItem(data);
    return res.status(201).json(item);
  },

  async getItemById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const item = await menuCategoryService.getItemById(id);

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    return res.json(item);
  },

  async updateItem(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const parseResult = updateMenuItemSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.flatten() });

    const ownerRestaurantId = await getItemRestaurantId(id);
    if (denyIfNotOwnerOrAdmin(req, res, ownerRestaurantId)) return;

    // If file is uploaded, use it; otherwise use URL from body if provided
    const data = { ...parseResult.data };
    if (req.file) {
      data.image = getMenuItemImageUrl(req.file.filename);
    }

    try {
      const item = await menuCategoryService.updateItem(id, data);
      return res.json(item);
    } catch (err: any) {
      return res.status(404).json({ message: "Menu item not found" });
    }
  },

  async deleteItem(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const ownerRestaurantId = await getItemRestaurantId(id);
    if (denyIfNotOwnerOrAdmin(req, res, ownerRestaurantId)) return;

    try {
      await menuCategoryService.deleteItem(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ message: "Menu item not found" });
    }
  },
};
