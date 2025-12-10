import { Request, Response } from "express";
import { cityService } from "./city.service";
import {
  createCitySchema,
  updateCitySchema,
} from "./city.schema";

export const cityController = {
  // POST /cities
  async create(req: Request, res: Response) {
    const parsed = createCitySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    const city = await cityService.createCity(parsed.data);
    return res.status(201).json(city);
  },

  // GET /cities or /cities?countryId=xyz
  async getAll(req: Request, res: Response) {
    const { countryId } = req.query;

    const cities = await cityService.getCities(
      countryId ? String(countryId) : undefined
    );

    return res.json(cities);
  },

  // GET /cities/:id
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "City ID is required" });
    }

    const city = await cityService.getCityById(id);

    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    return res.json(city);
  },

  // GET /cities/by-country/:countryId
  async getByCountryId(req: Request, res: Response) {
    const { countryId } = req.params;

    if (!countryId) {
      return res.status(400).json({ message: "Country ID is required" });
    }

    const cities = await cityService.getCities(countryId);

    return res.json(cities);
  },

  // PATCH /cities/:id
  async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "City ID is required" });
    }

    const parsed = updateCitySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const city = await cityService.updateCity(id, parsed.data);
      return res.json(city);
    } catch (err) {
      return res.status(404).json({ message: "City not found" });
    }
  },

  // DELETE /cities/:id
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "City ID is required" });
    }

    try {
      await cityService.deleteCity(id);
      return res.status(204).send();
    } catch (err) {
      return res.status(404).json({ message: "City not found" });
    }
  },
};
