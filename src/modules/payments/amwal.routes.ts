import { Router } from "express";
import { initiateAmwalSubscriptionPayment, confirmAmwalSmartBoxCallback } from "./amwal.controller";
import { amwalWebhook } from "./amwal.webhook";
import { verifyAmwalPayment } from "./amwal.verify";
import { renderAmwalTestPage } from "./amwal.testpage";

const router = Router();

/**
 * @swagger
 * /payments/amwal/initiate:
 *   post:
 *     summary: Initiate Amwal SmartBox payment for a subscription
 *     tags: [Payments]
 *     description: |
 *       Creates a pending subscription row and returns a signed SmartBox config.
 *       The frontend loads `scriptUrl`, then calls
 *       `SmartBox.Checkout.configure({ ...response.smartbox, completeCallback, errorCallback, cancelCallback })`
 *       followed by `SmartBox.Checkout.showSmartBox()`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurantId, planId]
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant user ID
 *               planId:
 *                 type: string
 *                 description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Signed SmartBox config returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 subscriptionId: { type: string }
 *                 scriptUrl: { type: string }
 *                 smartbox:
 *                   type: object
 *                   properties:
 *                     MID: { type: string }
 *                     TID: { type: string }
 *                     CurrencyId: { type: integer }
 *                     AmountTrxn: { type: string }
 *                     MerchantReference: { type: string }
 *                     TrxDateTime: { type: string }
 *                     PaymentViewType: { type: integer }
 *                     LanguageId: { type: string }
 *                     SecureHash: { type: string }
 *       400: { description: Missing or invalid input }
 *       404: { description: Restaurant or plan not found }
 *       500: { description: Internal server error }
 */
router.post("/payments/amwal/initiate", initiateAmwalSubscriptionPayment);

/**
 * @swagger
 * /payments/amwal/confirm:
 *   post:
 *     summary: Activate a subscription using the SmartBox completeCallback payload
 *     tags: [Payments]
 *     description: |
 *       Frontend-driven activation. Pass the `completeCallback` data the SDK
 *       fires after a successful card payment along with the subscription id.
 *       Backend verifies merchantReference + responseCode and flips the
 *       subscription to ACTIVE. Idempotent.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscriptionId, callback]
 *             properties:
 *               subscriptionId: { type: string }
 *               callback:
 *                 type: object
 *                 description: The full object passed to SmartBox's completeCallback
 *     responses:
 *       200: { description: Subscription activated (or already active) }
 *       400: { description: Invalid payload or unsuccessful callback }
 *       404: { description: Subscription not found }
 */
router.post("/payments/amwal/confirm", confirmAmwalSmartBoxCallback);

/**
 * @swagger
 * /payments/amwal/webhook:
 *   post:
 *     summary: Amwal merchant cloud notification
 *     tags: [Payments]
 *     description: Webhook configured on the Amwal side. Updates subscription status when payment is confirmed.
 *     responses:
 *       200: { description: Webhook processed }
 *       400: { description: Missing or invalid input }
 *       500: { description: Internal server error }
 */
router.post("/payments/amwal/webhook", amwalWebhook);

/**
 * @swagger
 * /payments/amwal/verify/{orderId}:
 *   get:
 *     summary: Poll subscription status after SmartBox completion
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Status returned }
 *       404: { description: Subscription not found }
 */
router.get("/payments/amwal/verify/:orderId", verifyAmwalPayment);

// Manual SmartBox test page — open in a browser to verify the full flow
// without involving the production frontend.
router.get("/payments/amwal/test-page", renderAmwalTestPage);

export default router;
