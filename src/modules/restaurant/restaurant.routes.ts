import { Router } from "express";
import { restaurantController } from "./restaurant.controller";
import { uploadRestaurantBanner } from "../../config/upload";

const router = Router();

/**
 * @swagger
 * /restaurant/create:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     description: |
 *       Create a new restaurant. You can either upload a banner image file or provide a banner URL.
 *       **Required fields:** userId, mallId, mainCategory
 *       **Optional fields:** banner (URL or file upload), description, location
 *       **Banner upload:** Use multipart/form-data with field name "banner" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [userId, mallId, mainCategory]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: "User ID (must be a valid user ID, becomes the restaurant's primary key)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               mallId:
 *                 type: string
 *                 description: Mall ID where the restaurant is located
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               mainCategory:
 *                 type: string
 *                 description: "Main cuisine category (e.g., 'CHINESE', 'INDIAN', 'ITALIAN')"
 *                 example: "CHINESE"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: "Restaurant banner image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *               description:
 *                 type: string
 *                 description: "Restaurant description (optional)"
 *                 example: "Authentic Chinese cuisine"
 *               location:
 *                 type: string
 *                 description: "Restaurant location within the mall (optional)"
 *                 example: "Food Court, Level 2"
 *           examples:
 *             withFileUpload:
 *               summary: Create with banner file upload
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mainCategory: "CHINESE"
 *                 description: "Authentic Chinese cuisine"
 *                 location: "Food Court, Level 2"
 *                 banner: "<file>"
 *             withBannerUrl:
 *               summary: Create with banner URL
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mainCategory: "CHINESE"
 *                 description: "Authentic Chinese cuisine"
 *                 location: "Food Court, Level 2"
 *                 banner: "https://example.com/restaurant-banner.jpg"
 *             withoutBanner:
 *               summary: Create without banner
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mainCategory: "CHINESE"
 *                 description: "Authentic Chinese cuisine"
 *                 location: "Food Court, Level 2"
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 mallId:
 *                   type: string
 *                 mainCategory:
 *                   type: string
 *                 banner:
 *                   type: string
 *                   nullable: true
 *                   description: URL to the restaurant banner (if provided)
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 location:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Validation error or failed to create restaurant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post("/restaurant/create", uploadRestaurantBanner.single("banner"), restaurantController.create);

/**
 * @swagger
 * /restaurant/get-all/{mallId}:
 *   get:
 *     summary: Get all restaurants for a mall
 *     tags: [Restaurants]
 *     description: |
 *       Get all restaurants for a specific mall with optional filtering by category and pagination.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: mallId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: "Filter by main category (optional)"
 *         example: "CHINESE"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "Page number for pagination (optional, default: 1)"
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: "Number of items per page (optional, default: 10)"
 *         example: 10
 *     responses:
 *       200:
 *         description: List of restaurants with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       mallId:
 *                         type: string
 *                       mainCategory:
 *                         type: string
 *                       banner:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       location:
 *                         type: string
 *                         nullable: true
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           image:
 *                             type: string
 *                             nullable: true
 *                 total:
 *                   type: integer
 *                   description: Total number of restaurants
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Items per page
 *       400:
 *         description: Invalid mall ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/restaurant/get-all/:mallId", restaurantController.getAll);

/**
 * @swagger
 * /restaurant/get-details/{restaurantId}:
 *   get:
 *     summary: Get full restaurant details
 *     tags: [Restaurants]
 *     description: |
 *       Get complete restaurant details including user info, menu categories, and all menu items.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 mallId:
 *                   type: string
 *                 mainCategory:
 *                   type: string
 *                 banner:
 *                   type: string
 *                   nullable: true
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 location:
 *                   type: string
 *                   nullable: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     image:
 *                       type: string
 *                       nullable: true
 *                 menuCategories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                               nullable: true
 *                             price:
 *                               type: number
 *                             preparationTime:
 *                               type: string
 *                               nullable: true
 *                             image:
 *                               type: string
 *                               nullable: true
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/restaurant/get-details/:restaurantId", restaurantController.getDetails);

/**
 * @swagger
 * /restaurant/update/{restaurantId}:
 *   patch:
 *     summary: Update a restaurant
 *     tags: [Restaurants]
 *     description: |
 *       Update a restaurant. You can either upload a banner image file or provide a banner URL.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Banner upload:** Use multipart/form-data with field name "banner" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       **Note:** userId cannot be updated (it's the primary key).
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               mallId:
 *                 type: string
 *                 description: "Mall ID (required)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               mainCategory:
 *                 type: string
 *                 description: "Main cuisine category (optional)"
 *                 example: "INDIAN"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: "Restaurant banner image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *               description:
 *                 type: string
 *                 description: "Restaurant description (optional)"
 *                 example: "Updated description"
 *               location:
 *                 type: string
 *                 description: "Restaurant location within the mall (optional)"
 *                 example: "Food Court, Level 3"
 *           examples:
 *             updateDescription:
 *               summary: Update only description
 *               value:
 *                 description: "Updated restaurant description"
 *             updateCategory:
 *               summary: Update only category
 *               value:
 *                 mainCategory: "INDIAN"
 *             updateWithBanner:
 *               summary: Update with banner file
 *               value:
 *                 description: "Updated description"
 *                 banner: "<file>"
 *             updateWithBannerUrl:
 *               summary: Update with banner URL
 *               value:
 *                 banner: "https://example.com/new-banner.jpg"
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 mallId:
 *                   type: string
 *                 mainCategory:
 *                   type: string
 *                 banner:
 *                   type: string
 *                   nullable: true
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 location:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/restaurant/update/:restaurantId", uploadRestaurantBanner.single("banner"), restaurantController.update);

/**
 * @swagger
 * /restaurant/delete/{restaurantId}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Restaurants]
 *     description: |
 *       Delete a restaurant. If the restaurant has a banner, it will be automatically deleted from storage.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Restaurant deleted successfully (no content)
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/restaurant/delete/:restaurantId", restaurantController.delete);

/**
 * @swagger
 * /restaurant/get-menu/{restaurantId}:
 *   get:
 *     summary: Get full restaurant menu
 *     tags: [Restaurants]
 *     description: |
 *       Get complete restaurant information with structured menu data (categories and items).
 *       This endpoint provides a formatted response with restaurant info and menu structure.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant menu retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                       description: Restaurant name (from user table)
 *                     profilePic:
 *                       type: string
 *                       nullable: true
 *                       description: Restaurant profile picture (from user table)
 *                     banner:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     location:
 *                       type: string
 *                       nullable: true
 *                     mainCategory:
 *                       type: string
 *                 menu:
 *                   type: array
 *                   description: Menu categories with items
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                               nullable: true
 *                             price:
 *                               type: number
 *                             preparationTime:
 *                               type: string
 *                               nullable: true
 *                             image:
 *                               type: string
 *                               nullable: true
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/restaurant/get-menu/:restaurantId", restaurantController.getFullMenu);

export default router;
