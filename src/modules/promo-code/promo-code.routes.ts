import { Router } from "express";
import promoCodeController from "./promo-code.controller";
import { requireAuth, requireUserRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /promo-codes:
 *   get:
 *     summary: Get available promo codes
 *     tags: [Promo Codes]
 *     description: |
 *       Get list of all currently active promo codes available for use.
 *       This endpoint is used on the checkout screen to display available codes.
 *       Returns codes that are currently within their validity period (between startDate and endDate).
 *       Public endpoint - anyone can view.
 *     responses:
 *       200:
 *         description: List of available promo codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalCount:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "550e8400-e29b-41d4-a716-446655440000"
 *                       code:
 *                         type: string
 *                         example: "SAVE20"
 *                       discountPercentage:
 *                         type: integer
 *                         example: 20
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-01T00:00:00Z"
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-31T23:59:59Z"
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *       500:
 *         description: Server error
 */
router.get("/", promoCodeController.getAvailablePromoCodes);

/**
 * @swagger
 * /promo-codes/restaurant/{restaurantId}:
 *   get:
 *     summary: Get valid promo codes for a specific restaurant
 *     tags: [Promo Codes]
 *     description: |
 *       Get all currently valid (non-expired) promo codes for a specific restaurant.
 *       Returns only promo codes that are active (between startDate and endDate).
 *       Public endpoint - used to show restaurant-specific promos.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: List of valid promo codes for the restaurant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalCount:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "550e8400-e29b-41d4-a716-446655440000"
 *                       code:
 *                         type: string
 *                         example: "SAVE20"
 *                       discountPercentage:
 *                         type: integer
 *                         example: 20
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-01T00:00:00Z"
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-31T23:59:59Z"
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *             example:
 *               success: true
 *               totalCount: 2
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   code: "SAVE20"
 *                   discountPercentage: 20
 *                   startDate: "2025-01-01T00:00:00Z"
 *                   endDate: "2025-12-31T23:59:59Z"
 *                   mall:
 *                     id: "mall-123"
 *                     name: "City Mall"
 *                   restaurant:
 *                     userId: "rest-456"
 *                     name: "Pizza Place"
 *                 - id: "660e8400-e29b-41d4-a716-446655440001"
 *                   code: "WELCOME15"
 *                   discountPercentage: 15
 *                   startDate: "2025-01-01T00:00:00Z"
 *                   endDate: "2025-06-30T23:59:59Z"
 *                   mall:
 *                     id: "mall-123"
 *                     name: "City Mall"
 *                   restaurant:
 *                     userId: "rest-456"
 *                     name: "Pizza Place"
 *       400:
 *         description: Restaurant ID is required
 *       500:
 *         description: Server error
 */
router.get("/restaurant/:restaurantId", promoCodeController.getValidPromoCodesByRestaurant);

/**
 * @swagger
 * /promo-codes/apply:
 *   post:
 *     summary: Apply and validate a promo code
 *     tags: [Promo Codes]
 *     description: |
 *       Validate a promo code and return its discount percentage.
 *       Validates the code's existence, date range, and restaurant applicability.
 *       Does not require subtotal; checkout will calculate the amount.
 *       Public endpoint - used during checkout.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: "Promo code (will be converted to uppercase)"
 *                 example: "SAVE20"
 *               restaurantId:
 *                 type: string
 *                 description: "Restaurant ID (optional, for checking applicability)"
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Promo code validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 promoCodeId:
 *                   type: string
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 code:
 *                   type: string
 *                   example: "SAVE20"
 *                 discountPercentage:
 *                   type: integer
 *                   example: 20
 *                 message:
 *                   type: string
 *                   example: "Promo code validated successfully"
 *       400:
 *         description: Invalid promo code or validation failed
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
 *                   example: "This promo code has expired"
 *       500:
 *         description: Server error
 */
// Applying promo code requires authenticated user
router.post("/apply", requireAuth, requireUserRole, promoCodeController.applyPromoCode);

export default router;
