import { Router } from "express";
import { userAdminController } from "./user.controller";

const router = Router();

/**
 * @swagger
 * /admin/users/{userId}/activate:
 *   patch:
 *     summary: Activate a user
 *     tags: [Admin - Users]
 *     description: |
 *       Activate a user by setting their status to ACTIVE.
 *       Creates a history entry in UserStatusHistory table.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for activating the user
 *                 example: "Appeal approved"
 *               actionById:
 *                 type: string
 *                 description: Admin user ID who performed the action
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             reason: "Appeal approved"
 *             actionById: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User activated"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     Status:
 *                       type: string
 *                       enum: [ACTIVE, BLOCKED]
 *                       example: "ACTIVE"
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User not found
 */
router.patch('/:userId/activate', userAdminController.activateUser);

/**
 * @swagger
 * /admin/users/{userId}/block:
 *   patch:
 *     summary: Block a user
 *     tags: [Admin - Users]
 *     description: |
 *       Block a user by setting their status to BLOCKED.
 *       Creates a history entry in UserStatusHistory table.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for blocking the user
 *                 example: "Fraudulent activity detected"
 *               actionById:
 *                 type: string
 *                 description: Admin user ID who performed the action
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             reason: "Fraudulent activity detected"
 *             actionById: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User blocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User blocked"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     Status:
 *                       type: string
 *                       enum: [ACTIVE, BLOCKED]
 *                       example: "BLOCKED"
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User not found
 */
router.patch('/:userId/block', userAdminController.blockUser);

/**
 * @swagger
 * /admin/users/active:
 *   get:
 *     summary: Get all active users
 *     tags: [Admin - Users]
 *     description: |
 *       Retrieve all users that are currently active (not blocked).
 *       Returns users where Status = ACTIVE.
 *       
 *       **Use case:** Admin dashboard to view active users
 *       
 *       **Testing:** Simply call GET /admin/users/active with no parameters
 *     responses:
 *       200:
 *         description: List of active users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: User ID (UUID)
 *                       email:
 *                         type: string
 *                         description: User email
 *                       name:
 *                         type: string
 *                         description: User name
 *                       firstName:
 *                         type: string
 *                         description: User first name
 *                       lastName:
 *                         type: string
 *                         description: User last name
 *                       role:
 *                         type: string
 *                         enum: [USER, RESTAURANT_OWNER, ADMIN]
 *                         description: User role
 *                       Status:
 *                         type: string
 *                         enum: [ACTIVE]
 *                         example: "ACTIVE"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: User creation date
 *             example:
 *               users:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   email: "john@example.com"
 *                   name: "John Doe"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   role: "USER"
 *                   Status: "ACTIVE"
 *                   createdAt: "2025-12-29T10:30:00Z"
 *               total: 42
 *       500:
 *         description: Failed to fetch active users
 */
router.get('/active', userAdminController.getActiveUsers);

/**
 * @swagger
 * /admin/users/blocked:
 *   get:
 *     summary: Get all blocked users
 *     tags: [Admin - Users]
 *     description: |
 *       Retrieve all users that are currently blocked.
 *       Returns users where Status = BLOCKED.
 *       
 *       **Use case:** Admin dashboard to view blocked users
 *       
 *       **Testing:** Simply call GET /admin/users/blocked with no parameters
 *     responses:
 *       200:
 *         description: List of blocked users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: User ID (UUID)
 *                       email:
 *                         type: string
 *                         description: User email
 *                       name:
 *                         type: string
 *                         description: User name
 *                       firstName:
 *                         type: string
 *                         description: User first name
 *                       lastName:
 *                         type: string
 *                         description: User last name
 *                       role:
 *                         type: string
 *                         enum: [USER, RESTAURANT_OWNER, ADMIN]
 *                         description: User role
 *                       Status:
 *                         type: string
 *                         enum: [BLOCKED]
 *                         example: "BLOCKED"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: User creation date
 *             example:
 *               users:
 *                 - id: "456f7890-e89b-12d3-a456-426614174111"
 *                   email: "blocked@example.com"
 *                   name: "Jane Smith"
 *                   firstName: "Jane"
 *                   lastName: "Smith"
 *                   role: "USER"
 *                   Status: "BLOCKED"
 *                   createdAt: "2025-12-25T14:20:00Z"
 *               total: 3
 *       500:
 *         description: Failed to fetch blocked users
 */
router.get('/blocked', userAdminController.getBlockedUsers);

export default router;
