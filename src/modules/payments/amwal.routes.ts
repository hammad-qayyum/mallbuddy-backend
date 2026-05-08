import { Router } from "express";
import {
  initiateAmwalSubscriptionPayment,
  confirmAmwalSmartBoxCallback,
  acquireAmwalSessionToken,
  renewAmwalSubscription,
} from "./amwal.controller";
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
 * /payments/amwal/session-token:
 *   post:
 *     summary: Exchange a stored customerId for a SmartBox session token
 *     tags: [Payments]
 *     description: |
 *       Calls Amwal's `Customer/GetSmartboxDirectCallSessionToken` and returns
 *       the resulting sessionToken. The frontend then passes that token into
 *       `SmartBox.Checkout.configure({ ..., SessionToken })` so the customer's
 *       saved cards appear on the SmartBox popup. The `customerId` itself is
 *       what SmartBox returned in `completeCallback.data.data.customerId` on
 *       the customer's first save-card payment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId]
 *             properties:
 *               customerId: { type: string, description: SmartBox customerId from a previous save-card transaction }
 *     responses:
 *       200:
 *         description: Session token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 sessionToken: { type: string }
 *       400: { description: customerId missing }
 *       500: { description: Amwal rejected the request }
 */
router.post("/payments/amwal/session-token", acquireAmwalSessionToken);

/**
 * @swagger
 * /payments/amwal/renew:
 *   post:
 *     summary: Charge a restaurant's saved card for a subscription plan (recurring renewal)
 *     tags: [Payments]
 *     description: |
 *       Server-to-server charge using the customer's saved `amwalCustomerId` /
 *       `amwalCustomerTokenId` (populated by `/confirm` when the customer
 *       ticked "save card" during their first SmartBox payment). Creates a
 *       new subscription row and activates it on success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurantId, planId]
 *             properties:
 *               restaurantId: { type: string }
 *               planId: { type: string }
 *     responses:
 *       200: { description: Subscription renewed }
 *       400: { description: Missing IDs or no saved card }
 *       402: { description: Amwal declined the charge }
 *       404: { description: Restaurant or plan not found }
 *       502: { description: Amwal upstream error }
 */
router.post("/payments/amwal/renew", renewAmwalSubscription);

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
