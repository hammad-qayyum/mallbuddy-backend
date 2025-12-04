import { Request, Response } from "express";
import { cuisineService } from "./cuisine.service";
import { createCuisineSchema, updateCuisineSchema } from "./cuisine.schema";
import { getCuisineCategoryImageUrl } from "../../config/upload";

export const cuisineController = {
  // POST /malls/:mallId/cuisine-categories
  async create(req: Request, res: Response) {
    const { mallId } = req.params;

    if (!mallId) {
      return res.status(400).json({ message: "Mall ID is required" });
    }

    const parseResult = createCuisineSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    // If file is uploaded, use it; otherwise use URL from body if provided
    const data = { ...parseResult.data };
    if (req.file) {
      data.image = getCuisineCategoryImageUrl(req.file.filename);
    }

    const category = await cuisineService.createCuisine(mallId, data);
    return res.status(201).json(category);
  },

  // GET /malls/:mallId/cuisine-categories
  async getAll(req: Request, res: Response) {
    const { mallId } = req.params;

    if (!mallId) {
      return res.status(400).json({ message: "Mall ID is required" });
    }

    const categories = await cuisineService.getAllCuisines(mallId);
    return res.json(categories);
  },

  // GET /cuisine-categories/:id
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    const category = await cuisineService.getCuisineById(id);

    if (!category) {
      return res.status(404).json({ message: "Cuisine category not found" });
    }

    return res.json(category);
  },

  // PATCH /cuisine-categories/:id
  async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    const parseResult = updateCuisineSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    // If file is uploaded, use it; otherwise use URL from body if provided
    const data = { ...parseResult.data };
    if (req.file) {
      data.image = getCuisineCategoryImageUrl(req.file.filename);
    }

    try {
      const category = await cuisineService.updateCuisine(id, data);
      return res.json(category);
    } catch (err: any) {
      return res.status(404).json({ message: "Cuisine category not found" });
    }
  },

  // DELETE /cuisine-categories/:id
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }

    try {
      await cuisineService.deleteCuisine(id);
      return res.status(204).send(); // No content
    } catch (err: any) {
      return res.status(404).json({ message: "Cuisine category not found" });
    }
  },
};
