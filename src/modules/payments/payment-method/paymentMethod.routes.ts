import { Router } from "express";
import {
  addPaymentMethod,
  getMyPaymentMethods,
  removePaymentMethod,
  makePaymentMethodDefault,
} from "./paymentMethod.controller";
import { requireAuth, requireUserRole } from "../../../middlewares/role.middleware";

const router = Router();

// All routes require USER role (requireAuth is applied globally)
router.use(requireUserRole);

/**
 * @swagger
 * /payment-methods:
 *   post:
 *     summary: Add a payment method
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Attach a Stripe payment method to the authenticated user's account.
 *       The user must have a Stripe customer ID set up first.
 *       **Required fields:** paymentMethodId (Stripe payment method ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID (e.g., pm_xxx)
 *                 example: "pm_1ABC123def456GHI"
 *     responses:
 *       201:
 *         description: Payment method added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserPaymentMethod"
 *       400:
 *         description: Missing paymentMethodId or Stripe customer ID not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       500:
 *         description: Failed to attach payment method
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.post("/payment-methods", addPaymentMethod);

/**
 * @swagger
 * /payment-methods:
 *   get:
 *     summary: Get user's payment methods
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Retrieve all saved payment methods for the authenticated user.
 *       Returns a list of payment methods ordered by creation date (newest first).
 *       **No request body required.**
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/UserPaymentMethod"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       500:
 *         description: Failed to fetch payment methods
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.get("/payment-methods", getMyPaymentMethods);

/**
 * @swagger
 * /payment-methods/{id}:
 *   delete:
 *     summary: Remove a payment method
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Remove a payment method from the authenticated user's account.
 *       The payment method will be detached from Stripe and deleted from the database.
 *       **Important:** The `id` parameter must be the database payment method ID (UUID), NOT the Stripe payment method ID (pm_xxx).
 *       Use the `id` field from the payment method object returned by GET /payment-methods.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Database payment method ID (UUID format). This is the `id` field from the payment method object, NOT the `stripePmId` field.
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Payment method removed successfully
 *       400:
 *         description: Missing payment method id in URL params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       404:
 *         description: Payment method not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       500:
 *         description: Failed to remove payment method
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.delete("/payment-methods/:id", removePaymentMethod);

/**
 * @swagger
 * /payment-methods/{id}/default:
 *   patch:
 *     summary: Set a payment method as default
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Set a payment method as the default payment method for the authenticated user.
 *       All other payment methods for the user will be unset as default.
 *       Only one payment method can be default at a time.
 *       **Important:** The `id` parameter must be the database payment method ID (UUID), NOT the Stripe payment method ID (pm_xxx).
 *       Use the `id` field from the payment method object returned by GET /payment-methods.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Database payment method ID (UUID format). This is the `id` field from the payment method object, NOT the `stripePmId` field.
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Payment method set as default successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/UserPaymentMethod"
 *       400:
 *         description: Missing payment method id in URL params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       404:
 *         description: Payment method not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 *       500:
 *         description: Failed to set default payment method
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Error"
 */
router.patch("/payment-methods/:id/default", makePaymentMethodDefault);

export default router;
