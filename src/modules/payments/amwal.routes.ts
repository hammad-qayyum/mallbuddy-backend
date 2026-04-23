import { Router } from "express";
import { initiateAmwalSubscriptionPayment } from "./amwal.controller";
import { amwalWebhook } from "./amwal.webhook";
import { amwalReturnCallback, verifyAmwalPayment } from "./amwal.verify";

const router = Router();

/**
 * @swagger
 * /payments/amwal/initiate:
 *   post:
 *     summary: Initiate Amwal subscription payment
 *     tags: [Payments]
 *     description: Initiates a payment for a restaurant subscription using Amwal Pay. Returns a payment URL to complete the payment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - planId
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant user ID
 *               planId:
 *                 type: string
 *                 description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Payment URL returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentUrl:
 *                   type: string
 *                 subscriptionId:
 *                   type: string
 *       400:
 *         description: Missing or invalid input
 *       500:
 *         description: Internal server error
 */
router.post("/payments/amwal/initiate", initiateAmwalSubscriptionPayment);

/**
 * @swagger
 * /payments/amwal/webhook:
 *   post:
 *     summary: Amwal payment webhook (legacy)
 *     tags: [Payments]
 *     description: Receives payment notifications from Amwal Pay (legacy MID/TID flow). Updates subscription status based on payment result.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - status
 *               - transaction_id
 *             properties:
 *               order_id:
 *                 type: string
 *                 description: Subscription/order ID
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *                 description: Payment status
 *               transaction_id:
 *                 type: string
 *                 description: Amwal transaction ID
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Missing or invalid input
 *       500:
 *         description: Internal server error
 */
router.post("/payments/amwal/webhook", amwalWebhook);

/**
 * @swagger
 * /payments/amwal/verify/{orderId}:
 *   get:
 *     summary: Verify Amwal payment status
 *     tags: [Payments]
 *     description: Checks the current status of a subscription payment by order ID.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription/order ID
 *     responses:
 *       200:
 *         description: Payment status returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 paymentReference:
 *                   type: string
 *                 planId:
 *                   type: string
 *                 restaurantId:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.get("/payments/amwal/verify/:orderId", verifyAmwalPayment);
router.get("/payments/amwal/return", amwalReturnCallback);

export default router;
