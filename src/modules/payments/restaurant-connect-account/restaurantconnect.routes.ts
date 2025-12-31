import { Router } from "express";
import * as controller from "./restaurantconnect.controller";
import { requireAuth, requireRestaurantRole } from "../../../middlewares/role.middleware";

const router = Router();

// All routes require restaurant role (requireAuth is applied globally)
router.use(requireRestaurantRole);

/**
 * @swagger
 * /payments/stripe/onboard:
 *   post:
 *     summary: Create Stripe Connect account for a restaurant
 *     tags: [Payments, Restaurant]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Creates a Stripe Connect Express account for a restaurant to receive payments.
 *       If the restaurant already has an account, returns the existing account ID.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - Restaurant must exist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant user ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Stripe Connect account created or already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stripe Connect account ready"
 *                 accountId:
 *                   type: string
 *                   description: Stripe Connect account ID
 *                   example: "acct_1234567890"
 *       400:
 *         description: Missing restaurantId
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Internal server error
 */
router.post("/onboard", controller.createStripeConnectAccount);

/**
 * @swagger
 * /payments/stripe/onboard-link:
 *   get:
 *     summary: Generate Stripe Connect onboarding link
 *     tags: [Payments, Restaurant]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Generates a Stripe onboarding link for a restaurant to complete their account setup.
 *       The restaurant will be redirected to this URL to provide business information.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - Restaurant must have a Stripe Connect account
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Onboarding link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: Stripe onboarding URL
 *                   example: "https://connect.stripe.com/setup/s/xxxxx"
 *       400:
 *         description: Missing restaurantId or restaurant has no Stripe account
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/onboard-link", controller.getOnboardingLink);

/**
 * @swagger
 * /payments/stripe/status:
 *   get:
 *     summary: Check Stripe Connect account status
 *     tags: [Payments, Restaurant]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Retrieves the current status of a restaurant's Stripe Connect account,
 *       including whether charges and payouts are enabled.
 *       
 *       **Requirements:**
 *       - User must be authenticated
 *       - Restaurant must have a Stripe Connect account
 *     parameters:
 *       - in: query
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant user ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Account status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [completed, pending]
 *                   description: Account onboarding status
 *                 charges_enabled:
 *                   type: boolean
 *                   description: Whether the account can receive charges
 *                 payouts_enabled:
 *                   type: boolean
 *                   description: Whether the account can receive payouts
 *       400:
 *         description: Missing restaurantId or restaurant has no Stripe account
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/status", controller.getStripeAccountStatus);

export default router;
