import { Router } from "express";
import menuSearchController from "./menu-search.controller";

const router = Router();

/**
 * @swagger
 * /restaurant/{restaurantId}/menu/search:
 *   get:
 *     summary: Search menu items and categories
 *     tags: [Menu Search]
 *     description: |
 *       Search for both menu items and categories in a specific restaurant's menu.
 *       Searches categories by name and menu items by name or description.
 *       This is the "Search menu" feature shown in the restaurant menu section.
 *       Public endpoint - anyone can search.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: "Search query (searches in item/category names and item descriptions)"
 *         example: "appetizer"
 *     responses:
 *       200:
 *         description: Search results found with both categories and items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 query:
 *                   type: string
 *                   example: "appetizer"
 *                 restaurantId:
 *                   type: string
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 restaurantName:
 *                   type: string
 *                   example: "Rozna Restaurant"
 *                 totalResults:
 *                   type: integer
 *                   description: Total count of matching categories + items
 *                   example: 5
 *                 results:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       description: Matching menu categories
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "cat-001"
 *                           name:
 *                             type: string
 *                             example: "Appetizers"
 *                           sortOrder:
 *                             type: integer
 *                             nullable: true
 *                             example: 1
 *                           itemCount:
 *                             type: integer
 *                             description: Number of items in this category
 *                             example: 5
 *                     items:
 *                       type: array
 *                       description: Matching menu items
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "item-001"
 *                           name:
 *                             type: string
 *                             example: "Crispy Appetizer Platter"
 *                           description:
 *                             type: string
 *                             nullable: true
 *                             example: "Mixed appetizers with dipping sauces"
 *                           price:
 *                             type: number
 *                             format: float
 *                             example: 8.99
 *                           image:
 *                             type: string
 *                             nullable: true
 *                             example: "/uploads/menu-items/appetizer-001.jpg"
 *                           preparationTime:
 *                             type: string
 *                             nullable: true
 *                             example: "10-15 mins"
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "cat-001"
 *                               name:
 *                                 type: string
 *                                 example: "Appetizers"
 *       404:
 *         description: Restaurant not found or no results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Restaurant not found"
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid search parameters"
 */
router.get("/restaurant/:restaurantId/menu/search", menuSearchController.searchMenu);

export default router;
