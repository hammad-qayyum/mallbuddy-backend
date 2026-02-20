import { Router } from "express";
import { registerExpoToken } from "./notification.controller";
import { requireAuth } from "../../middlewares/role.middleware";

/**
 * Notification Routes
 * 
 * Routes for managing push notification tokens and settings.
 * 
 * @module notifications/notification.routes
 */

const router = Router();

/**
 * @swagger
 * /notifications/register-token:
 *   post:
 *     summary: Register Expo push notification token
 *     tags: [Notifications]
 *     description: |
 *       Register an Expo push notification token for the authenticated user.
 *       This token is used to send push notifications for order updates and other events.
 *       
 *       **How it works:**
 *       1. The mobile app (React Native with Expo) generates a push token using Expo's notification API
 *       2. When the app starts or user logs in, it calls this endpoint to register the token
 *       3. The token is stored in the user's profile in the database
 *       4. When order status changes occur, the system automatically sends push notifications
 *          to all registered tokens for that user
 *       
 *       **Token Assignment Flow:**
 *       - Token is generated automatically by Expo SDK in the mobile app
 *       - App calls this endpoint on login/startup to register/update the token
 *       - Token is stored in `User.expoPushToken` field
 *       - Notifications are sent automatically when:
 *         * Order status changes (ACCEPTED, PREPARING, READY, CANCELLED)
 *         * New orders are placed (for restaurants)
 *         * Orders are cancelled (for restaurants)
 *       
 *       **Note:** The token should be registered whenever:
 *       - User logs in
 *       - App starts (if user is already logged in)
 *       - Token changes (Expo may regenerate tokens)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *                 description: "Expo push notification token (format: ExponentPushToken[xxxxx])"
 *                 example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *     responses:
 *       200:
 *         description: Push token registered successfully
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
 *                   example: "Push token registered successfully"
 *       400:
 *         description: Missing or invalid expoPushToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "expoPushToken is required"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: User not authenticated"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to register push token"
 */
// Notification routes require authenticated user
router.post("/register-token", requireAuth, registerExpoToken);

export default router;
