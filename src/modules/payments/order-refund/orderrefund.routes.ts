import { Router } from "express";
import { refundPayment } from "./orderrefund.controller";
import { requireAuth, requireRole } from "../../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /payments/refund:
 *   post:
 *     summary: Refund an order payment
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Refund a payment for an order. Can be a full refund or partial refund.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - Order must exist and be paid
 *       - Order must have a Stripe PaymentIntent
 *       
 *       **What happens:**
 *       - Creates a refund in Stripe
 *       - If amount is not provided, full refund is issued
 *       - If amount is provided, partial refund is issued
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Order ID to refund
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               amount:
 *                 type: number
 *                 description: Amount to refund in cents (optional, if not provided, full refund)
 *                 example: 5000
 *           examples:
 *             fullRefund:
 *               summary: Full refund
 *               value:
 *                 orderId: "123e4567-e89b-12d3-a456-426614174000"
 *             partialRefund:
 *               summary: Partial refund
 *               value:
 *                 orderId: "123e4567-e89b-12d3-a456-426614174000"
 *                 amount: 5000
 *     responses:
 *       200:
 *         description: Refund initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Refund initiated"
 *                 refundId:
 *                   type: string
 *                   description: Stripe refund ID
 *                   example: "re_3ABC123def456GHI"
 *       400:
 *         description: Missing orderId or order not eligible for refund
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "orderId required"
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not eligible for refund"
 */
// Refund endpoint - requires ADMIN or RESTAURANT role
// Refund requires authentication and admin or restaurant role
router.post("/refund", requireAuth, requireRole("ADMIN", "RESTAURANT"), refundPayment);

export default router;

