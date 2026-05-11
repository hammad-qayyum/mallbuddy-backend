import { Router } from "express";
import {
  cancelSubscription,
  getRestaurantSubscriptions,
  getMySubscriptions,
} from "./subscription.controller";
import { requireRestaurantRole } from "../../../middlewares/role.middleware";

const router = Router();

// Subscription create/update flows live at `POST /api/payments/amwal/initiate`
// (single canonical entry point that returns the SmartBox config). The legacy
// `/subscribe`, `/update`, `/amwal-webhook`, `/attach-payment-method` routes
// have been removed — see AUDIT.md (N1, I1).

router.use(requireRestaurantRole);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: Cancels an active subscription immediately.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscriptionId]
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 description: Subscription ID
 *     responses:
 *       200: { description: Subscription cancelled }
 *       400: { description: Missing subscriptionId }
 *       404: { description: Subscription not found }
 *       500: { description: Internal server error }
 */
router.post("/cancel", cancelSubscription);

/**
 * @swagger
 * /subscriptions/list/{restaurantId}:
 *   get:
 *     summary: Get all subscriptions for a restaurant
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Subscriptions retrieved }
 *       500: { description: Internal server error }
 */
router.get("/list/:restaurantId", getRestaurantSubscriptions);

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: List the caller's own subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: Returns subscriptions belonging to the authenticated restaurant.
 *     responses:
 *       200: { description: Subscriptions retrieved }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
router.get("/", getMySubscriptions);

export default router;
