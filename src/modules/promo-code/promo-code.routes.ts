import { Router } from "express";
import promoCodeController from "./promo-code.controller";

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
router.post("/apply", promoCodeController.applyPromoCode);

export default router;
