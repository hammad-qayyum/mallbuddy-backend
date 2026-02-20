import { Router } from "express";
import * as controller from "./subscriptionplan.controller";
import { requireAuth, requireAdminRole } from "../../../../middlewares/role.middleware";

const router = Router();

// Apply admin role to all subscription plan routes (requireAuth is applied globally)
router.use(requireAdminRole);

/**
 * @swagger
 * /subscription-plans:
 *   post:
 *     summary: Create a new subscription plan (Admin only)
 *     tags: [Subscription Plans, Admin]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Creates a new subscription plan and automatically creates a Stripe product and price.
 *       The plan will be active by default.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - interval
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Plan name
 *                 example: "Basic Plan"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Plan price in USD
 *                 example: 9.99
 *               interval:
 *                 type: string
 *                 enum: [MONTHLY, YEARLY]
 *                 description: Billing interval
 *                 example: "MONTHLY"
 *               features:
 *                 type: object
 *                 description: Plan features as JSON object
 *                 example: { "feature1": true, "feature2": false }
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
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
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.post("/", controller.createPlan);

/**
 * @swagger
 * /subscription-plans:
 *   get:
 *     summary: Get all active subscription plans
 *     tags: [Subscription Plans]
 *     description: |
 *       Retrieves all active subscription plans. Returns empty array if no active plans exist.
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
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
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       interval:
 *                         type: string
 *                         enum: [MONTHLY, YEARLY]
 *                       features:
 *                         type: object
 *                       stripePriceId:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *       500:
 *         description: Internal server error
 */
router.get("/", controller.getPlans);

/**
 * @swagger
 * /subscription-plans/{id}:
 *   get:
 *     summary: Get a subscription plan by ID
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *         example: "plan-123"
 *     responses:
 *       200:
 *         description: Subscription plan retrieved successfully
 *       404:
 *         description: Subscription plan not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", controller.getPlanById);

/**
 * @swagger
 * /subscription-plans/{id}:
 *   put:
 *     summary: Update a subscription plan (Admin only)
 *     tags: [Subscription Plans, Admin]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Updates a subscription plan. Only provided fields will be updated.
 *       Empty or null values will be ignored to preserve existing data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *         example: "plan-123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Plan name (optional)
 *                 example: "Updated Plan Name"
 *               features:
 *                 type: object
 *                 description: Plan features as JSON object (optional)
 *                 example: { "feature1": true, "feature2": false }
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Subscription plan not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", controller.updatePlan);

/**
 * @swagger
 * /subscription-plans/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a subscription plan (Admin only)
 *     tags: [Subscription Plans, Admin]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Deactivates a subscription plan. Deactivated plans will not appear in the list of active plans.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *         example: "plan-123"
 *     responses:
 *       200:
 *         description: Subscription plan deactivated successfully
 *       404:
 *         description: Subscription plan not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/deactivate", controller.deactivatePlan);

export default router;
