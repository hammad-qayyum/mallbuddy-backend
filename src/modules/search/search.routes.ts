import { Router } from "express";
import { searchController } from "./search.controller";

const router = Router();

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Global search across restaurants and foods
 *     tags: [Search]
 *     description: |
 *       Search across restaurants and food items globally.
 *       This is a public endpoint that doesn't require authentication.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: "pizza"
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [all, restaurants, foods]
 *           default: all
 *         description: Type of search - all, restaurants only, or foods only
 *         example: "all"
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 query:
 *                   type: string
 *                 type:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     restaurants:
 *                       type: array
 *                       items:
 *                         type: object
 *                     foods:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Missing or invalid search query
 *       500:
 *         description: Internal server error
 */
// GET /search?q=...&type=all|restaurants|foods
router.get("/search", (req, res, next) => {
  try {
    return searchController.search(req, res);
  } catch (err) {
    return next(err);
  }
});

export default router;
