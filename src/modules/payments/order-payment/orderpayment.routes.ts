import { Router } from "express";
import { createPaymentIntent } from "./orderpayment.controller";
import { stripeWebhookHandler } from "../stripe-webhooks/stripe.webhook";
import express from "express";
import { requireAuth, requireUserRole } from "../../../middlewares/role.middleware";

const router = Router();


/**
 * @swagger
 * /payments/create-payment-intent:
 *   post:
 *     summary: Create Stripe payment intent for an order
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Create a Stripe PaymentIntent for an order that uses CARD payment method.
 *       This endpoint creates a payment intent on Stripe and returns the client secret
 *       which is used by the frontend to complete the payment using Stripe Elements.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - Order must exist
 *       - Order payment method must be CARD
 *       
 *       **What happens:**
 *       - Creates a Stripe PaymentIntent with the order total amount
 *       - Saves the PaymentIntent ID to the order
 *       - Sets order payment status to PENDING
 *       - Returns the client secret for frontend payment processing
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
 *                 description: Order ID to create payment intent for
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           examples:
 *             basic:
 *               summary: Create payment intent for order
 *               value:
 *                 orderId: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: PaymentIntent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "PaymentIntent created successfully"
 *                 clientSecret:
 *                   type: string
 *                   description: Stripe PaymentIntent client secret. Use this with Stripe Elements to complete the payment.
 *                   example: "pi_3ABC123def456GHI_secret_xyz789"
 *             examples:
 *               success:
 *                 summary: Payment intent created
 *                 value:
 *                   message: "PaymentIntent created successfully"
 *                   clientSecret: "pi_3ABC123def456GHI_secret_xyz789"
 *       400:
 *         description: Missing orderId or order payment method is not CARD
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Missing orderId in request body"
 *             examples:
 *               missingOrderId:
 *                 summary: Missing orderId
 *                 value:
 *                   message: "Missing orderId in request body"
 *               invalidPaymentMethod:
 *                 summary: Order payment method is not CARD
 *                 value:
 *                   message: "Order payment method is not CARD"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 *       500:
 *         description: Internal server error or Stripe API error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to create payment intent"
 */
// Payment intent creation requires authenticated user
router.post("/create-payment-intent", requireAuth, createPaymentIntent);


export default router;
