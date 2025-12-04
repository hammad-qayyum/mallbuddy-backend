import { Request, Response } from "express";
import { mallService } from "./mall.service";
import {
  createMallSchema,
  updateMallSchema,
} from "./mall.schema";

export const mallController = {
  // POST /malls
  async create(req: Request, res: Response) {
    const parsed = createMallSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const mall = await mallService.createMall(parsed.data);
      return res.status(201).json(mall);
    } catch (err: any) {
      // Handle validation errors (city not found, etc.)
      if (err.message?.includes("does not exist")) {
        return res.status(400).json({
          message: err.message,
        });
      }

      // Handle unique constraint violations (duplicate mall name in same city)
      if (err.code === "P2002") {
        return res.status(400).json({
          message: "A mall with this name already exists in this city",
        });
      }

      // Handle foreign key constraint (shouldn't happen now with validation, but keep as fallback)
      if (err.code === "P2003") {
        return res.status(400).json({
          message: "Invalid city ID. The specified city does not exist",
        });
      }

      // Generic error
      return res.status(400).json({
        message: "Failed to create mall",
        error: err.message,
      });
    }
  },

  // GET /malls or /malls?cityId=abc
  async getAll(req: Request, res: Response) {
    const { cityId } = req.query;

    const malls = await mallService.getMalls(
      cityId ? String(cityId) : undefined
    );

    return res.json(malls);
  },

  // GET /malls/:id
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Mall ID is required" });
    }

    const mall = await mallService.getMallById(id);

    if (!mall) {
      return res.status(404).json({ message: "Mall not found" });
    }

    return res.json(mall);
  },

  // PATCH /malls/:id
  async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Mall ID is required" });
    }

    const parsed = updateMallSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const mall = await mallService.updateMall(id, parsed.data);
      return res.json(mall);
    } catch (err: any) {
      // Handle validation errors (city not found, etc.)
      if (err.message?.includes("does not exist")) {
        return res.status(400).json({
          message: err.message,
        });
      }

      // Handle "Record to update not found" or foreign key constraint
      if (err.code === "P2025" || err.code === "P2003") {
        return res.status(404).json({
          message: "Mall not found",
        });
      }

      // Handle unique constraint violations
      if (err.code === "P2002") {
        return res.status(400).json({
          message: "A mall with this name already exists in this city",
        });
      }

      return res.status(404).json({
        message: "Mall not found",
      });
    }
  },

  // DELETE /malls/:id
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Mall ID is required" });
    }

    try {
      await mallService.deleteMall(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({
        message: "Mall not found",
      });
    }
  },
};
