import { Router } from "express";
import { restaurantAdminController } from "./restaurant.controller";
import { requireAuth, requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

// Apply admin role to all admin restaurant routes (requireAuth is applied globally)
router.use(requireAdminRole);

/**
 * @swagger
 * /admin/restaurants/{restaurantId}/block:
 *   patch:
 *     summary: Block or unblock a restaurant
 *     tags: [Admin - Restaurants]
 *     description: |
 *       Block or unblock a restaurant by setting its RestaurantStatus.
 *       - Use isBlocked true to block a restaurant (sets RestaurantStatus to BLOCKED)
 *       - Use isBlocked false to unblock a restaurant (sets RestaurantStatus to ACTIVE)
 *       - Creates a history entry in RestaurantStatusHistory table
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (same as userId)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isBlocked
 *             properties:
 *               isBlocked:
 *                 type: boolean
 *                 description: Set to true to block, false to unblock
 *                 example: true
 *               reason:
 *                 type: string
 *                 description: Reason for blocking/unblocking the restaurant
 *                 example: "Violation of terms and conditions"
 *               actionById:
 *                 type: string
 *                 description: Admin user ID who performed the action
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             isBlocked: true
 *             reason: "Violation of terms and conditions"
 *             actionById: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant block status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurant blocked"
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     RestaurantStatus:
 *                       type: string
 *                       enum: [ACTIVE, BLOCKED]
 *                       example: "BLOCKED"
 *                     approvalStatus:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED]
 *       400:
 *         description: Invalid request - isBlocked must be boolean
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "isBlocked must be boolean"
 */
router.patch('/:restaurantId/block', restaurantAdminController.setRestaurantBlockStatus);

/**
 * @swagger
 * /admin/restaurants/{restaurantId}/approval:
 *   patch:
 *     summary: Set restaurant approval status
 *     tags: [Admin - Restaurants]
 *     description: |
 *       Set the approval status of a restaurant. Used for admin approval workflow.
 *       Creates a history entry in RestaurantStatusHistory table.
 *       
 *       **Available statuses:**
 *       - PENDING - Restaurant is awaiting approval
 *       - APPROVED - Restaurant is approved and can operate
 *       - REJECTED - Restaurant application was rejected
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (same as userId)
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approvalStatus
 *             properties:
 *               approvalStatus:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *                 description: New approval status
 *                 example: APPROVED
 *               reason:
 *                 type: string
 *                 description: Reason for approval/rejection
 *                 example: "All requirements met"
 *               actionById:
 *                 type: string
 *                 description: Admin user ID who performed the action
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *           example:
 *             approvalStatus: "APPROVED"
 *             reason: "All requirements met"
 *             actionById: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant approval status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurant status set to APPROVED"
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     RestaurantStatus:
 *                       type: string
 *                       enum: [ACTIVE, BLOCKED]
 *                     approvalStatus:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED]
 *                       example: "APPROVED"
 *       400:
 *         description: Invalid approval status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid approvalStatus"
 */
router.patch('/:restaurantId/approval', restaurantAdminController.setRestaurantApprovalStatus);

/**
 * @swagger
 * /admin/restaurants/active:
 *   get:
 *     summary: Get all active restaurants
 *     tags: [Admin - Restaurants]
 *     description: |
 *       Retrieve all restaurants that are currently active (not blocked).
 *       Returns restaurants where RestaurantStatus = ACTIVE.
 *       
 *       **Use case:** Admin dashboard to view active restaurants
 *       
 *       **Testing:** Simply call GET /admin/restaurants/active with no parameters
 *     responses:
 *       200:
 *         description: List of active restaurants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     description: Restaurant ID (same as user ID)
 *                   name:
 *                     type: string
 *                     description: Restaurant name
 *                   banner:
 *                     type: string
 *                     description: Restaurant banner image URL
 *                   description:
 *                     type: string
 *                     description: Restaurant description
 *                   mainCategory:
 *                     type: string
 *                     description: Main cuisine category
 *                   RestaurantStatus:
 *                     type: string
 *                     enum: [ACTIVE]
 *                     example: "ACTIVE"
 *                   approvalStatus:
 *                     type: string
 *                     enum: [PENDING, APPROVED, REJECTED]
 *                   mallId:
 *                     type: string
 *                   location:
 *                     type: string
 *             example:
 *               - userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Pizza Palace"
 *                 banner: "/uploads/restaurants/banner.jpg"
 *                 description: "Best pizza in town"
 *                 mainCategory: "ITALIAN"
 *                 RestaurantStatus: "ACTIVE"
 *                 approvalStatus: "APPROVED"
 *                 mallId: "mall-123"
 *                 location: "Food Court Level 2"
 */
router.get('/active', restaurantAdminController.getActiveRestaurants);

/**
 * @swagger
 * /admin/restaurants/blocked:
 *   get:
 *     summary: Get all blocked restaurants
 *     tags: [Admin - Restaurants]
 *     description: |
 *       Retrieve all restaurants that are currently blocked.
 *       Returns restaurants where RestaurantStatus = BLOCKED.
 *       
 *       **Use case:** Admin dashboard to view blocked restaurants
 *       
 *       **Testing:** Simply call GET /admin/restaurants/blocked with no parameters
 *     responses:
 *       200:
 *         description: List of blocked restaurants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     description: Restaurant ID (same as user ID)
 *                   name:
 *                     type: string
 *                     description: Restaurant name
 *                   banner:
 *                     type: string
 *                     description: Restaurant banner image URL
 *                   description:
 *                     type: string
 *                     description: Restaurant description
 *                   mainCategory:
 *                     type: string
 *                     description: Main cuisine category
 *                   RestaurantStatus:
 *                     type: string
 *                     enum: [BLOCKED]
 *                     example: "BLOCKED"
 *                   approvalStatus:
 *                     type: string
 *                     enum: [PENDING, APPROVED, REJECTED]
 *                   mallId:
 *                     type: string
 *                   location:
 *                     type: string
 *             example:
 *               - userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Closed Restaurant"
 *                 banner: "/uploads/restaurants/banner.jpg"
 *                 description: "Temporarily closed"
 *                 mainCategory: "CHINESE"
 *                 RestaurantStatus: "BLOCKED"
 *                 approvalStatus: "APPROVED"
 *                 mallId: "mall-123"
 *                 location: "Food Court Level 3"
 */
router.get('/blocked', restaurantAdminController.getBlockedRestaurants);

/**
 * @swagger
 * /admin/restaurants/search:
 *   get:
 *     summary: Search restaurants by name
 *     tags: [Admin - Restaurants]
 *     description: |
 *       Search for restaurants by restaurant name (case-insensitive partial match).
 *       Returns restaurants with user information.
 *       
 *       **Use case:** Admin dashboard search functionality to find specific restaurants
 *       
 *       **Testing Examples:**
 *       - GET /admin/restaurants/search?search=Pizza - finds all restaurants with "Pizza" in name
 *       - GET /admin/restaurants/search?search=Burger - finds all restaurants with "Burger" in name
 *       - GET /admin/restaurants/search?search=Coffee - finds all restaurants with "Coffee" in name
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search term to find restaurants (case-insensitive)
 *         example: "Pizza"
 *     responses:
 *       200:
 *         description: Restaurants matching search term
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 restaurants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         description: Restaurant ID (same as user ID)
 *                       name:
 *                         type: string
 *                         description: Restaurant name
 *                       banner:
 *                         type: string
 *                         description: Restaurant banner image
 *                       description:
 *                         type: string
 *                         description: Restaurant description
 *                       mainCategory:
 *                         type: string
 *                         description: Main cuisine category
 *                       RestaurantStatus:
 *                         type: string
 *                         enum: [ACTIVE, BLOCKED]
 *                       approvalStatus:
 *                         type: string
 *                         enum: [PENDING, APPROVED, REJECTED]
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                 total:
 *                   type: integer
 *                   example: 5
 *             example:
 *               restaurants:
 *                 - userId: "123e4567-e89b-12d3-a456-426614174000"
 *                   name: "Pizza Paradise"
 *                   banner: "/uploads/restaurants/banner.jpg"
 *                   description: "Best pizza in town"
 *                   mainCategory: "ITALIAN"
 *                   RestaurantStatus: "ACTIVE"
 *                   approvalStatus: "APPROVED"
 *                   user:
 *                     id: "123e4567-e89b-12d3-a456-426614174000"
 *                     email: "owner@pizzaparadise.com"
 *                     name: "John Doe"
 *               total: 1
 *       400:
 *         description: Search term is required
 *       500:
 *         description: Failed to search restaurants
 */
router.get('/search', restaurantAdminController.searchRestaurants);

export default router;
