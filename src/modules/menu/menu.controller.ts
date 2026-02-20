import { Request, Response } from "express";
import { menuCategoryService } from "./menu.service";
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from "./menu.schema";
import { getMenuItemImageUrl } from "../../config/upload";

export const menuCategoryController = {
  // Menu Categories

  async createCategory(req: Request, res: Response) {
    const parseResult = createMenuCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parseResult.error.flatten() });
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

    try {
      await menuCategoryService.deleteItem(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ message: "Menu item not found" });
    }
  },
};
