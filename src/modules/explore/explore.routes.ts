import { Router } from "express";
import { exploreController } from "./explore.controller";
import { galleryController } from "../gallery/gallery.controller";

const router = Router();

/**
 * @swagger
 * /explore/restaurants:
 *   get:
 *     summary: Explore restaurants
 *     tags: [Explore]
 *     description: |
 *       Get a list of restaurants for exploration/browsing.
 *       This is a public endpoint that doesn't require authentication.
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
 *       500:
 *         description: Internal server error
 */
// GET /explore/restaurants
router.get("/restaurants", (req, res, next) => exploreController.getExplore(req, res).catch(next));

/**
 * @swagger
 * /explore/restaurants/{restaurantId}:
 *   get:
 *     summary: Get restaurant details for exploration
 *     tags: [Explore]
 *     description: |
 *       Get detailed information about a specific restaurant for exploration.
 *       This is a public endpoint that doesn't require authentication.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant details retrieved successfully
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
// GET /explore/restaurants/:restaurantId
router.get("/restaurants/:restaurantId", (req, res, next) => exploreController.getExploreDetail(req, res).catch(next));

/**
 * @swagger
 * /explore/restaurants/{restaurantId}/gallery:
 *   get:
 *     summary: Get restaurant gallery images
 *     tags: [Explore, Gallery]
 *     description: |
 *       Get all gallery images for a restaurant.
 *       This is a public endpoint that doesn't require authentication.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Gallery images retrieved successfully
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
// GET gallery (delegated to gallery controller)
router.get("/restaurants/:restaurantId/gallery", (req, res, next) => galleryController.getGallery(req, res).catch(next));

/**
 * @swagger
 * /explore/restaurants/{restaurantId}/story:
 *   get:
 *     summary: Get restaurant story
 *     tags: [Explore]
 *     description: |
 *       Get the story/narrative of a restaurant.
 *       This is a public endpoint that doesn't require authentication.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant story retrieved successfully
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
// GET story
router.get("/restaurants/:restaurantId/story", (req, res, next) => exploreController.getStory(req, res).catch(next));

export default router;
