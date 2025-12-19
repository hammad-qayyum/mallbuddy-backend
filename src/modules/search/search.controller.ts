import { Request, Response } from "express";
import { searchQuerySchema } from "./search.schema";
import { searchService } from "./search.service";

export const searchController = {
  // GET /search?q=...
  async search(req: Request, res: Response) {
    const parse = searchQuerySchema.safeParse({ q: req.query.q });
    if (!parse.success) {
      return res.status(400).json({ success: false, message: 'Invalid query', errors: parse.error.flatten() });
    }

    const { q } = parse.data;

    try {
      const result = await searchService.search(q);
      if (!result || !result.restaurants || result.restaurants.length === 0) {
        return res.status(404).json({ success: false, message: 'Sorry Not found' });
      }

      return res.json({ success: true, totalResults: result.totalResults, data: result.restaurants });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Search failed', error: err?.message });
    }
  },
};
