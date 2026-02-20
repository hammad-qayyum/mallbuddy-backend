import { Router } from "express";
import {
  subscribeRestaurant,
  updateSubscription,
  cancelSubscription,
  getRestaurantSubscriptions,
  attachPaymentMethod,
} from "./subscription.controller";
import { requireAuth, requireRestaurantRole } from "../../../middlewares/role.middleware";

const router = Router();

// Apply restaurant role to all subscription routes (requireAuth is applied globally)
router.use(requireRestaurantRole);

/**
 * @swagger
 * /subscriptions/subscribe:
 *   post:
 *     summary: Subscribe a restaurant to a subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Creates a new subscription for a restaurant to a specific plan.
 *       Creates a Stripe customer if one doesn't exist, then creates a Stripe subscription.
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
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               planId:
 *                 type: string
 *                 description: Subscription plan ID
 *                 example: "plan_1234567890"
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                       description: Database subscription record
 *                     clientSecret:
 *                       type: string
 *                       nullable: true
 *                       description: Payment intent client secret for completing payment on frontend
 *                     stripeSubscription:
 *                       type: object
 *                       description: Stripe subscription object
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Restaurant or plan not found
 *       500:
 *         description: Internal server error
 */
router.post("/subscribe", subscribeRestaurant);

/**
 * @swagger
 * /subscriptions/update:
 *   put:
 *     summary: Update subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Updates an existing subscription to a new plan.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *               - newPlanId
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 description: Subscription ID in database
 *                 example: "sub_1234567890"
 *               newPlanId:
 *                 type: string
 *                 description: New subscription plan ID
 *                 example: "plan_9876543210"
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Subscription or plan not found
 *       500:
 *         description: Internal server error
 */
router.put("/update", updateSubscription);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Cancels an active subscription immediately.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 description: Subscription ID in database
 *                 example: "sub_1234567890"
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       400:
 *         description: Missing subscriptionId
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
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
 *     description: |
 *       Retrieves all subscriptions (active, expired, cancelled) for a specific restaurant.
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
 *         description: Subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing restaurantId
 *       500:
 *         description: Internal server error
 */
router.get("/list/:restaurantId", getRestaurantSubscriptions);

/**
 * @swagger
 * /subscriptions/attach-payment-method:
 *   post:
 *     summary: Attach payment method to restaurant subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Attaches a payment method to a restaurant's subscription customer.
 *       This allows the subscription to charge the restaurant's payment method.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - paymentMethodId
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant user ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID
 *                 example: "pm_1234567890"
 *     responses:
 *       200:
 *         description: Payment method attached successfully
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
 *                   example: "Payment method attached successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
router.post("/attach-payment-method", attachPaymentMethod);

export default router;
