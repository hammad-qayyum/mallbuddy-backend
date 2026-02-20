import { Request, Response } from "express";
import { countryService } from "./country.service";
import {
  createCountrySchema,
  updateCountrySchema,
} from "./country.schema";

export const countryController = {
  // POST /countries
  async create(req: Request, res: Response) {
    // Validate request body with Zod
    const parseResult = createCountrySchema.safeParse(req.body);

    if (!parseResult.success) {
      // If validation fails, send 400 with error details
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    const country = await countryService.createCountry(parseResult.data);
    return res.status(201).json(country);
  },

  // GET /countries
  async getAll(req: Request, res: Response) {
    const countries = await countryService.getAllCountries();
    return res.json(countries);
  },

  // GET /countries/:id
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Country ID is required" });
    }

    const country = await countryService.getCountryById(id);

    if (!country) {
      return res.status(404).json({ message: "Country not found" });
    }

    return res.json(country);
  },

  // PATCH /countries/:id
  async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Country ID is required" });
    }

    // Validate body with update schema
    const parseResult = updateCountrySchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parseResult.error.flatten(),
      });
    }

    try {
      const country = await countryService.updateCountry(id, parseResult.data);
      return res.json(country);
    } catch (err: any) {
      // Most likely Prisma will throw if the ID doesn't exist
      return res.status(404).json({ message: "Country not found" });
    }
  },

  // DELETE /countries/:id
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Country ID is required" });
    }

    try {
      await countryService.deleteCountry(id);
      return res.status(204).send(); // No content
    } catch (err: any) {
      return res.status(404).json({ message: "Country not found" });
    }
  },
};
