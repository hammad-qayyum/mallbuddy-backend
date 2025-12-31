import { Router } from "express";
import { adminSearchController } from "./search.controller";
import { requireAuth, requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

// Apply admin role to all admin search routes (requireAuth is applied globally)
router.use(requireAdminRole);

/**
 * @swagger
 * /admin/search:
 *   get:
 *     summary: Unified search across malls, restaurants, and users
 *     tags: [Admin - Search]
 *     description: |
 *       Search across malls, restaurants, and users in a single API.
 *       Returns matching results for all entities that match the search criteria.
 *       
 *       **Search Behavior:**
 *       - **Malls:** Searches by mall name
 *       - **Restaurants:** Searches by restaurant name
 *       - **Users:** Searches by name, firstName, and lastName fields
 *       
 *       All results are returned with pagination applied uniformly.
 *       
 *       **Testing Examples:**
 *       
 *       Search all entities by name:
 *       GET /admin/search?name=John&page=1&limit=10
 *       
 *       Get first page of results:
 *       GET /admin/search?page=1&limit=20
 *       
 *       Search for specific restaurant:
 *       GET /admin/search?name=Pizza&page=1&limit=10
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search term for malls, restaurants, and users (case-insensitive)
 *         example: "John"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Unified search results with malls, restaurants, and users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: object
 *                   properties:
 *                     malls:
 *                       type: object
 *                       properties:
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 description: Mall ID
 *                               name:
 *                                 type: string
 *                                 description: Mall name
 *                               city:
 *                                 type: string
 *                                 description: City where mall is located
 *                               country:
 *                                 type: string
 *                                 description: Country where mall is located
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                         total:
 *                           type: integer
 *                           description: Total number of matching malls
 *                     restaurants:
 *                       type: object
 *                       properties:
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 description: Restaurant ID (same as user ID)
 *                               name:
 *                                 type: string
 *                                 description: Restaurant name
 *                               description:
 *                                 type: string
 *                                 description: Restaurant description
 *                               mainCategory:
 *                                 type: string
 *                                 description: Main cuisine category
 *                               RestaurantStatus:
 *                                 type: string
 *                                 enum: [ACTIVE, BLOCKED]
 *                               approvalStatus:
 *                                 type: string
 *                                 enum: [PENDING, APPROVED, REJECTED]
 *                               mallId:
 *                                 type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                         total:
 *                           type: integer
 *                           description: Total number of matching restaurants
 *                     users:
 *                       type: object
 *                       properties:
 *                         data:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 description: User ID
 *                               email:
 *                                 type: string
 *                                 description: User email
 *                               name:
 *                                 type: string
 *                                 description: User name
 *                               firstName:
 *                                 type: string
 *                                 description: User first name
 *                               lastName:
 *                                 type: string
 *                                 description: User last name
 *                               role:
 *                                 type: string
 *                                 enum: [USER, RESTAURANT_OWNER, ADMIN]
 *                               Status:
 *                                 type: string
 *                                 enum: [ACTIVE, BLOCKED]
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                         total:
 *                           type: integer
 *                           description: Total number of matching users
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalResults:
 *                       type: integer
 *                       description: Total count of all matching results (malls + restaurants + users)
 *             example:
 *               results:
 *                 malls:
 *                   data:
 *                     - id: "mall-123"
 *                       name: "Metro Mall"
 *                       city: "New York"
 *                       country: "USA"
 *                       createdAt: "2025-12-01T10:00:00Z"
 *                   total: 1
 *                 restaurants:
 *                   data:
 *                     - userId: "rest-456"
 *                       name: "John's Restaurant"
 *                       description: "Best Italian food"
 *                       mainCategory: "ITALIAN"
 *                       RestaurantStatus: "ACTIVE"
 *                       approvalStatus: "APPROVED"
 *                       mallId: "mall-123"
 *                       createdAt: "2025-12-15T14:30:00Z"
 *                   total: 1
 *                 users:
 *                   data:
 *                     - id: "user-789"
 *                       email: "john@example.com"
 *                       name: "John Doe"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       role: "USER"
 *                       Status: "ACTIVE"
 *                       createdAt: "2025-11-20T09:15:00Z"
 *                   total: 5
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *                 totalResults: 7
 *       500:
 *         description: Failed to search
 */
router.get('/', adminSearchController.unifiedSearch);

export default router;
