import { Router } from "express";
import { adminPromoCodeController } from "./promo-code.controller";
import { requireAuth, requireAdminRole } from "../../../middlewares/role.middleware";

const router = Router();

// Apply admin role to all admin promo code routes (requireAuth is applied globally)
router.use(requireAdminRole);

/**
 * @swagger
 * /admin/promo-codes:
 *   post:
 *     summary: Create a new promo code
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Create a new promo code for a specific mall and restaurant.
 *       
 *       **Testing Example:**
 *       POST /admin/promo-codes
 *       ```json
 *       {
 *         "mallId": "mall-123",
 *         "restaurantId": "rest-456",
 *         "code": "SUMMER2025",
 *         "discountPercentage": 20,
 *         "endDate": "2026-08-31T23:59:59Z"
 *       }
 *       ```
 *       
 *       **Note:** startDate is auto-generated as current timestamp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mallId
 *               - restaurantId
 *               - code
 *               - discountPercentage
 *               - endDate
 *             properties:
 *               mallId:
 *                 type: string
 *                 description: Mall ID
 *                 example: "mall-123"
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant ID
 *                 example: "rest-456"
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 description: Promo code (will be converted to uppercase)
 *                 example: "SUMMER2025"
 *               discountPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Discount percentage (0-100)
 *                 example: 20
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Promo code end date (startDate is auto-generated)
 *                 example: "2026-08-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Promo code created successfully
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
 *                   example: "Promo code created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     mallId:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     code:
 *                       type: string
 *                     discountPercentage:
 *                       type: number
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create promo code
 */
router.post("/", adminPromoCodeController.createPromoCode);

/**
 * @swagger
 * /admin/promo-codes:
 *   get:
 *     summary: Get all promo codes
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Retrieve all promo codes with mall and restaurant details.
 *       
 *       **Testing:** Simply call GET /admin/promo-codes
 *     responses:
 *       200:
 *         description: List of all promo codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       mallId:
 *                         type: string
 *                       restaurantId:
 *                         type: string
 *                       code:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *       500:
 *         description: Failed to fetch promo codes
 */
router.get("/", adminPromoCodeController.getAllPromoCodes);

/**
 * @swagger
 * /admin/promo-codes/search:
 *   get:
 *     summary: Search promo codes by code name
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Search for promo codes by code name (case-insensitive partial match).
 *       
 *       **Use case:** Admin dashboard search functionality to find specific promo codes
 *       
 *       **Testing Examples:**
 *       - GET /admin/promo-codes/search?search=SAVE - finds all codes containing "SAVE"
 *       - GET /admin/promo-codes/search?search=2025 - finds all codes containing "2025"
 *       - GET /admin/promo-codes/search?search=TEST - finds all codes containing "TEST"
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search term to find promo codes (case-insensitive)
 *         example: "SAVE"
 *     responses:
 *       200:
 *         description: Promo codes matching search term
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                 total:
 *                   type: integer
 *                   example: 3
 *             example:
 *               success: true
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   code: "SAVE20"
 *                   discountPercentage: 20
 *                   startDate: "2025-12-29T00:00:00Z"
 *                   endDate: "2025-12-31T23:59:59Z"
 *                   mall:
 *                     id: "mall-123"
 *                     name: "City Mall"
 *                   restaurant:
 *                     userId: "rest-456"
 *                     name: "Pizza Place"
 *               total: 1
 *       400:
 *         description: Search term is required or empty
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
 *                   example: "Search term is required"
 *       404:
 *         description: No promo codes found matching search term
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   example: []
 *                 total:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "No promo codes found"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to search promo codes"
 *                 error:
 *                   type: string
 */
router.get("/search", adminPromoCodeController.searchPromoCodes);

/**
 * @swagger
 * /admin/promo-codes/restaurant/{restaurantId}:
 *   get:
 *     summary: Get valid promo codes for a specific restaurant
 *     tags: [Admin - Promo Codes]
 */
router.put("/:id", adminPromoCodeController.updatePromoCode);

/**
 * @swagger
 * /admin/promo-codes/{id}:
 *   delete:
 *     summary: Delete a promo code
 *     tags: [Admin - Promo Codes]
 *     description: Permanently delete a promo code
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Promo code ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Promo code deleted successfully
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
 *                   example: "Promo code deleted successfully"
 *       400:
 *         description: Promo code ID is required
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
 *                   example: "Promo code ID is required"
 *       404:
 *         description: Promo code not found
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
 *                   example: "Promo code not found"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to delete promo code"
 *                 error:
 *                   type: string
 */
router.delete("/:id", adminPromoCodeController.deletePromoCode);

/**
 * @swagger
 * /admin/promo-codes/search:
 *   get:
 *     summary: Search promo codes by code name
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Search for promo codes by code name (case-insensitive partial match).
 *       
 *       **Use case:** Admin dashboard search functionality to find specific promo codes
 *       
 *       **Testing Examples:**
 *       - GET /admin/promo-codes/search?search=SAVE - finds all codes containing "SAVE"
 *       - GET /admin/promo-codes/search?search=2025 - finds all codes containing "2025"
 *       - GET /admin/promo-codes/search?search=TEST - finds all codes containing "TEST"
 *     parameters:
 *       - in: query
 *         name: search
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Search term to find promo codes (case-insensitive)
 *         example: "SAVE"
 *     responses:
 *       200:
 *         description: Promo codes matching search term
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                 total:
 *                   type: integer
 *                   example: 3
 *             example:
 *               success: true
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   code: "SAVE20"
 *                   discountPercentage: 20
 *                   startDate: "2025-12-29T00:00:00Z"
 *                   endDate: "2025-12-31T23:59:59Z"
 *                   mall:
 *                     id: "mall-123"
 *                     name: "City Mall"
 *                   restaurant:
 *                     userId: "rest-456"
 *                     name: "Pizza Place"
 *               total: 1
 *       400:
 *         description: Search term is required or empty
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
 *                   example: "Search term is required"
 *       404:
 *         description: No promo codes found matching search term
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   example: []
 *                 total:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "No promo codes found"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to search promo codes"
 *                 error:
 *                   type: string
 */
router.get("/search", adminPromoCodeController.searchPromoCodes);

/**
 * @swagger
 * /admin/promo-codes/restaurant/{restaurantId}:
 *   get:
 *     summary: Get valid promo codes for a specific restaurant
 *     tags: [Admin - Promo Codes]
 *     description: |
 *       Get all currently valid (non-expired) promo codes for a specific restaurant.
 *       Returns only promo codes where startDate <= now <= endDate.
 *       Useful for viewing active promotions for a specific restaurant.
 *       
 *       **Testing Example:**
 *       GET /admin/promo-codes/restaurant/550e8400-e29b-41d4-a716-446655440000
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: List of valid promo codes for the restaurant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       discountPercentage:
 *                         type: number
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       mall:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                       restaurant:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           name:
 *                             type: string
 *                 total:
 *                   type: integer
 *                   example: 2
 *                 message:
 *                   type: string
 *                   example: "No valid promo codes found for this restaurant"
 *             example:
 *               success: true
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   code: "SAVE20"
 *                   discountPercentage: 20
 *                   startDate: "2025-12-29T00:00:00Z"
 *                   endDate: "2026-01-31T23:59:59Z"
 *                   mall:
 *                     id: "mall-123"
 *                     name: "City Mall"
 *                   restaurant:
 *                     userId: "rest-456"
 *                     name: "Pizza Place"
 *                 - id: "660e8400-e29b-41d4-a716-446655440001"
 *                   code: "WELCOME15"
 *                   discountPercentage: 15
 *                   startDate: "2025-12-01T00:00:00Z"
 *                   endDate: "2026-06-30T23:59:59Z"
 *                   mall:
 *                     id: "mall-123"
 *                     name: "City Mall"
 *                   restaurant:
 *                     userId: "rest-456"
 *                     name: "Pizza Place"
 *               total: 2
 *       400:
 *         description: Restaurant ID is required
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
 *                   example: "Restaurant ID is required"
 *       404:
 *         description: No valid promo codes found for restaurant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   example: []
 *                 total:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: "No valid promo codes found for this restaurant"
 *       500:
 *         description: Server error
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
 *                   example: "Failed to fetch restaurant promo codes"
 *                 error:
 *                   type: string
 */
router.get("/restaurant/:restaurantId", adminPromoCodeController.getValidPromoCodesByRestaurant);

export default router;
