import {Router} from "express";
import {userController} from "./user.controller";
import {requireAuth} from "../../middlewares/auth.middleware";

const router = Router();

// All these routes are protected and require user to be logged in

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Get the complete profile information for the currently authenticated user.
 *       **No request body required.**
 *       Returns all user profile fields including id, name, email, phoneNumber, firstName, lastName, image, role, etc.
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Unique user identifier
 *                 name:
 *                   type: string
 *                   nullable: true
 *                   description: Full name (used by Better Auth, auto-generated from firstName + lastName)
 *                 email:
 *                   type: string
 *                   description: User's email address
 *                 phoneNumber:
 *                   type: string
 *                   nullable: true
 *                   description: User's phone number (normalized, digits only)
 *                 firstName:
 *                   type: string
 *                   nullable: true
 *                   description: User's first name
 *                 lastName:
 *                   type: string
 *                   nullable: true
 *                   description: User's last name
 *                 image:
 *                   type: string
 *                   nullable: true
 *                   description: URL to user's profile image
 *                 role:
 *                   type: string
 *                   enum: [USER, ADMIN, VENDOR, DELIVERY_PERSON]
 *                   description: User's role
 *                 userVerified:
 *                   type: boolean
 *                   description: Whether the user is verified
 *                 emailVerified:
 *                   type: boolean
 *                   nullable: true
 *                   description: Whether the email is verified (Better Auth field)
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Account creation timestamp
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Last update timestamp
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", requireAuth, userController.getMyProfile);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Update user profile information. 
 *       **All fields are optional** - send only the fields you want to update.
 *       You can update any combination of: firstName, lastName, email, phoneNumber, image
 *       Note: When updating firstName or lastName, the Better Auth `name` field is automatically updated.
 *       Phone numbers are automatically normalized (non-digit characters removed).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           examples:
 *             updateName:
 *               summary: Update only name fields
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *             updateEmail:
 *               summary: Update only email
 *               value:
 *                 email: "newemail@example.com"
 *             updatePhone:
 *               summary: Update only phone number
 *               value:
 *                 phoneNumber: "+12345678901"
 *             updateImage:
 *               summary: Update only profile image
 *               value:
 *                 image: "https://example.com/profile.jpg"
 *             updateAll:
 *               summary: Update multiple fields
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 phoneNumber: "12345678901"
 *                 image: "https://example.com/profile.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 image:
 *                   type: string
 *                 name:
 *                   type: string
 *                   description: Better Auth name field (auto-updated when firstName/lastName changes)
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/me", requireAuth, userController.updateProfile);

/**
 * @swagger
 * /users/me/password:
 *   patch:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Change user password. 
 *       **Required fields:** currentPassword, newPassword
 *       Both passwords must be at least 6 characters long.
 *       The current password is verified using Better Auth's authentication system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *           example:
 *             currentPassword: "oldpassword123"
 *             newPassword: "newpassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password updated successfully
 *       400:
 *         description: Validation error or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               validationError:
 *                 value:
 *                   message: "Current password is required"
 *               incorrectPassword:
 *                 value:
 *                   message: "Current password is incorrect"
 *               noPasswordFound:
 *                 value:
 *                   message: "No password found for this user"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/me/password", requireAuth, userController.changePassword);

/**
 * @swagger
 * /users/me:
 *   delete:
 *     summary: Delete current user profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     description: Permanently delete the current user's account and all associated data. This action cannot be undone.
 *     responses:
 *       204:
 *         description: User profile deleted successfully (no content)
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/me", requireAuth, userController.deleteMyProfile);

export default router;
