import { Router } from "express";
import { promotionController } from "./promotion.controller";
import { uploadPromotionBanner } from "../../../config/upload";
import { requireAuth, requireRestaurantRole, requireRestaurantOwnership } from "../../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /restaurant/{restaurantId}/promotions:
 *   post:
 *     summary: Create a new promotion for a restaurant
 *     tags: [Restaurant, Promotions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Create a new promotion for a restaurant. Requires banner image upload (PNG/JPEG, max 2MB),
 *       discount percentage, start date, and end date.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - Restaurant must exist
 *       - Banner image: PNG or JPEG, max 2MB
 *       - Title: minimum 6 characters
 *       - Discount percentage: 0-100
 *       - Dates: DD/MM/YYYY format
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - discountPercentage
 *               - startDate
 *               - endDate
 *               - banner
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 100
 *                 description: Promotion title (minimum 6 characters)
 *                 example: "Summer Special Offer"
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Discount percentage (e.g., 50 for 50%)
 *                 example: 50
 *               startDate:
 *                 type: string
 *                 pattern: "^\\d{2}/\\d{2}/\\d{4}$"
 *                 description: Start date in DD/MM/YYYY format
 *                 example: "01/06/2024"
 *               endDate:
 *                 type: string
 *                 pattern: "^\\d{2}/\\d{2}/\\d{4}$"
 *                 description: End date in DD/MM/YYYY format
 *                 example: "30/06/2024"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Banner image (PNG or JPEG, max 2MB)
 *     responses:
 *       201:
 *         description: Promotion created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Promotion created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     banner:
 *                       type: string
 *                     discountPercentage:
 *                       type: number
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     isActive:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
// Promotion management routes - require restaurant role and ownership (GET routes are public)
router.post(
  "/restaurant/:restaurantId/promotions",
  requireAuth,
  requireRestaurantRole,
  requireRestaurantOwnership,
  uploadPromotionBanner.single("banner"),
  promotionController.createPromotion
);

/**
 * @swagger
 * /restaurant/{restaurantId}/promotions:
 *   get:
 *     summary: Get all promotions for a restaurant
 *     tags: [Restaurant, Promotions]
 *     description: |
 *       Get all promotions for a specific restaurant.
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
 *         description: Promotions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Promotions retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       restaurantId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       banner:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
router.get("/restaurant/:restaurantId/promotions", promotionController.getPromotionsByRestaurant);

/**
 * @swagger
 * /restaurant/{restaurantId}/promotions/active:
 *   get:
 *     summary: Get active promotions for a restaurant
 *     tags: [Restaurant, Promotions]
 *     description: |
 *       Get all currently active promotions for a restaurant (where current date is between start and end date).
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
 *         description: Active promotions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Active promotions retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       restaurantId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       banner:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
router.get("/restaurant/:restaurantId/promotions/active", promotionController.getActivePromotions);

/**
 * @swagger
 * /promotions/{id}:
 *   get:
 *     summary: Get a single promotion by ID
 *     tags: [Promotions]
 *     description: |
 *       Get details of a specific promotion by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Promotion ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Promotion retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Promotion retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     banner:
 *                       type: string
 *                     discountPercentage:
 *                       type: number
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     isActive:
 *                       type: boolean
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Internal server error
 */
router.get("/promotions/:id", promotionController.getPromotionById);

/**
 * @swagger
 * /promotions/{id}:
 *   put:
 *     summary: Update a promotion
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Update an existing promotion. All fields are optional.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Promotion ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 100
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               startDate:
 *                 type: string
 *                 pattern: "^\\d{2}/\\d{2}/\\d{4}$"
 *               endDate:
 *                 type: string
 *                 pattern: "^\\d{2}/\\d{2}/\\d{4}$"
 *               banner:
 *                 type: string
 *                 format: binary
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Promotion updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/promotions/:id",
  requireAuth,
  requireRestaurantRole,
  uploadPromotionBanner.single("banner"),
  promotionController.updatePromotion
);

/**
 * @swagger
 * /promotions/{id}:
 *   delete:
 *     summary: Delete a promotion
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Delete a promotion. This will also delete the associated banner image.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Promotion ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Promotion deleted successfully
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Internal server error
 */
router.delete("/promotions/:id", requireAuth, requireRestaurantRole, promotionController.deletePromotion);

export default router;

