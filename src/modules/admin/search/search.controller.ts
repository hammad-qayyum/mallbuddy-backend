import { Request, Response } from "express";
import { adminSearchService } from "./search.service";

export const adminSearchController = {
  // Unified search across malls, restaurants, and users
  async unifiedSearch(req: Request, res: Response) {
    try {
      const { name, page = 1, limit = 10 } = req.query;

      const result = await adminSearchService.unifiedSearch({
        name: name as string,
        page: Number(page),
        limit: Number(limit),
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to search', error: err.message });
    }
  },
};
