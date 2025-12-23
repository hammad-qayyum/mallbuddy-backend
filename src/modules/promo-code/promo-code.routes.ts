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
 *                         example: "promo-001"
 *                       code:
 *                         type: string
 *                         example: "PROMOCODE2025"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "50%OFF"
 *                       discountType:
 *                         type: string
 *                         enum: [PERCENTAGE, FIXED]
 *                         example: "PERCENTAGE"
 *                       discountValue:
 *                         type: number
 *                         example: 50
 *                       validUntil:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-31T23:59:59Z"
 *                       maxUses:
 *                         type: integer
 *                         nullable: true
 *                         example: 100
 *                       usedCount:
 *                         type: integer
 *                         example: 45
 *       500:
 *         description: Server error
 */
router.get("/promo-codes", promoCodeController.getAvailablePromoCodes);

/**
 * @swagger
 * /promo-codes/apply:
 *   post:
 *     summary: Apply and validate a promo code
 *     tags: [Promo Codes]
 *     description: |
 *       Apply a promo code and calculate the discount amount.
 *       Returns discount details if valid, or error message if invalid.
 *       Public endpoint - used during checkout.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - subtotal
 *             properties:
 *               code:
 *                 type: string
 *                 description: "Promo code (will be converted to uppercase)"
 *                 example: "PROMOCODE2025"
 *               subtotal:
 *                 type: number
 *                 description: "Order subtotal amount for discount calculation"
 *                 example: 100
 *               restaurantId:
 *                 type: string
 *                 description: "Restaurant ID (optional, for checking applicability)"
 *                 example: "rest-001"
 *     responses:
 *       200:
 *         description: Promo code applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: "PROMOCODE2025"
 *                 discountType:
 *                   type: string
 *                   enum: [PERCENTAGE, FIXED]
 *                   example: "PERCENTAGE"
 *                 discountValue:
 *                   type: number
 *                   example: 50
 *                 discountAmount:
 *                   type: number
 *                   example: 50
 *                 originalAmount:
 *                   type: number
 *                   example: 100
 *                 finalAmount:
 *                   type: number
 *                   example: 50
 *                 message:
 *                   type: string
 *                   example: "Promo code applied successfully"
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
router.post("/promo-codes/apply", promoCodeController.applyPromoCode);

/**
 * @swagger
 * /admin/promo-codes:
 *   get:
 *     summary: Get all promo codes (Admin)
 *     tags: [Promo Codes - Admin]
 *     description: |
 *       Get all promo codes (active and inactive).
 *       Admin management endpoint (authentication currently not enforced).
 *     responses:
 *       200:
 *         description: List of all promo codes
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
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       discountType:
 *                         type: string
 *                       discountValue:
 *                         type: number
 *                       validFrom:
 *                         type: string
 *                         format: date-time
 *                       validUntil:
 *                         type: string
 *                         format: date-time
 *                       maxUses:
 *                         type: integer
 *                         nullable: true
 *                       usedCount:
 *                         type: integer
 *                       isActive:
 *                         type: boolean
 *                       applicableToAll:
 *                         type: boolean
 *       500:
 *         description: Server error
 */
router.get("/admin/promo-codes", promoCodeController.getAllPromoCodes);

/**
 * @swagger
 * /admin/promo-codes:
 *   post:
 *     summary: Create a new promo code (Admin)
 *     tags: [Promo Codes - Admin]
 *     description: |
 *       Create a new promo code.
 *       Admin management endpoint (authentication currently not enforced).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *               - validFrom
 *               - validUntil
 *             properties:
 *               code:
 *                 type: string
 *                 description: "Unique promo code (will be converted to uppercase)"
 *                 example: "PROMOCODE2025"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: "50%OFF"
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *                 example: "PERCENTAGE"
 *               discountValue:
 *                 type: number
 *                 description: "Discount value (50 for 50% or 10 for 10 OMR)"
 *                 example: 50
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-01T00:00:00Z"
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59Z"
 *               maxUses:
 *                 type: integer
 *                 nullable: true
 *                 description: "Maximum number of times this code can be used (null = unlimited)"
 *                 example: 100
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               minOrderAmount:
 *                 type: number
 *                 nullable: true
 *                 description: "Minimum order amount required to use this code"
 *                 example: 10
 *               applicableToAll:
 *                 type: boolean
 *                 default: true
 *                 description: "If false, only applicable to specific restaurants"
 *               applicableRestaurantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Restaurant IDs (only if applicableToAll is false)"
 *                 example: ["rest-001", "rest-002"]
 *     responses:
 *       201:
 *         description: Promo code created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post("/admin/promo-codes", promoCodeController.createPromoCode);

/**
 * @swagger
 * /admin/promo-codes/{promoCodeId}/deactivate:
 *   patch:
 *     summary: Deactivate a promo code (Admin)
 *     tags: [Promo Codes - Admin]
 *     description: |
 *       Deactivate a promo code so it cannot be used.
 *       Admin management endpoint (authentication currently not enforced).
 *     parameters:
 *       - in: path
 *         name: promoCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Promo code ID"
 *     responses:
 *       200:
 *         description: Promo code deactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       404:
 *         description: Promo code not found
 *       500:
 *         description: Server error
 */
router.patch("/admin/promo-codes/:promoCodeId/deactivate", promoCodeController.deactivatePromoCode);

export default router;
