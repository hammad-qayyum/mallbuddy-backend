import { Request, Response } from "express";
import { searchQuerySchema } from "./search.schema";
import { searchService } from "./search.service";

export const searchController = {
  // GET /search?q=<query>&mallId=<optional>
  async search(req: Request, res: Response) {
    const parse = searchQuerySchema.safeParse({
      q: req.query.q,
      mallId: req.query.mallId,
    });
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query",
        errors: parse.error.flatten(),
      });
    }

    const { q, mallId } = parse.data;

    try {
      const result = await searchService.search(q, mallId);

      // 200 with empty arrays for the "no matches" case. The previous 404 +
      // body trick was caught as a transport error by the FE axios
      // interceptor and surfaced as a toast on every non-matching keystroke.
      return res.json({
        success: true,
        totalResults: result.totalResults,
        restaurants: result.restaurants,
        menuItems: result.menuItems,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ success: false, message: "Search failed", error: err?.message });
    }
  },
};
