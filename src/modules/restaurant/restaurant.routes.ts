import { Router } from "express";
import { restaurantController } from "./restaurant.controller";
import { uploadRestaurantBanner } from "../../config/upload";
import { requireAuth, requireAdminRole, requireRestaurantRole, requireRestaurantOwnership, requireRole } from "../../middlewares/role.middleware";

const router = Router();


/**
 * @swagger
 * /admin/restaurants/create:
 *   post:
 *     summary: Admin creates restaurant account
 *     tags: [Restaurants]
 *     description: |
 *       Admin creates a restaurant account. Creates a new User with role RESTAURANT and a Restaurant profile atomically.
 *       You can either upload a banner image file or provide a banner URL.
 *       **Required fields:** email, password, name, location, description, phoneNumber
 *       **Optional fields:** firstName, lastName, mallId, mainCategory, banner (URL or file upload), story, cuisineCategoryId, isFavorite
 *       **Banner upload:** Use multipart/form-data with field name "banner" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [email, password, name, location, description, phoneNumber]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Restaurant owner email
 *                 example: "rozna.restaurant@gmail.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (minimum 8 characters)
 *               phoneNumber:
 *                 type: string
 *                 description: Restaurant phone number
 *                 example: "+968-24-857392"
 *               name:
 *                 type: string
 *                 description: Restaurant name
 *                 example: "Rozna Restaurant"
 *               location:
 *                 type: string
 *                 description: Restaurant address/location
 *                 example: "Food Court, Level 2, Mall Name"
 *               description:
 *                 type: string
 *                 description: Restaurant details/description
 *                 example: "Authentic Chinese cuisine with family recipes"
 *               firstName:
 *                 type: string
 *                 description: Restaurant owner first name (optional)
 *               lastName:
 *                 type: string
 *                 description: Restaurant owner last name (optional)
 *               mallId:
 *                 type: string
 *                 description: Mall ID where restaurant is located (optional, can be set later)
 *               mainCategory:
 *                 type: string
 *                 description: Main cuisine category (optional)
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Restaurant banner image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)
 *               story:
 *                 type: string
 *                 description: Restaurant story/intro (optional)
 *               cuisineCategoryId:
 *                 type: string
 *                 description: Cuisine category ID (optional)
 *               isFavorite:
 *                 type: boolean
 *                 description: Mark as featured/favorite (optional)
 *           examples:
 *             withFileUpload:
 *               summary: Create with banner file upload
 *               value:
 *                 email: "rozna.restaurant@gmail.com"
 *                 password: "password123"
 *                 name: "Rozna Restaurant"
 *                 location: "Food Court, Level 2"
 *                 description: "Authentic Chinese cuisine"
 *                 phoneNumber: "+968-24-857392"
 *                 banner: "<file>"
 *             withBannerUrl:
 *               summary: Create with banner URL
 *               value:
 *                 email: "rozna.restaurant@gmail.com"
 *                 password: "password123"
 *                 name: "Rozna Restaurant"
 *                 location: "Food Court, Level 2"
 *                 description: "Authentic Chinese cuisine"
 *                 phoneNumber: "+968-24-857392"
 *                 banner: "https://example.com/restaurant-banner.jpg"
 *             withoutBanner:
 *               summary: Create without banner
 *               value:
 *                 email: "rozna.restaurant@gmail.com"
 *                 password: "password123"
 *                 name: "Rozna Restaurant"
 *                 location: "Food Court, Level 2"
 *                 description: "Authentic Chinese cuisine"
 *                 phoneNumber: "+968-24-857392"
 *     responses:
 *       201:
 *         description: Restaurant account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           example: "RESTAURANT"
 *                     restaurant:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         mallId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         onboardingCompleted:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Validation error
 *       404:
 *         description: Mall not found
 *       409:
 *         description: Email already registered
 */
// Admin route - require admin role
router.post("/admin/restaurants/create", requireAuth, requireAdminRole, uploadRestaurantBanner.single("banner"), restaurantController.createByAdmin);

/**
 * @swagger
 * /restaurant/get-all/{mallId}:
 *   get:
 *     summary: Get all restaurants for a mall
 *     tags: [Restaurants]
 *     description: |
 *       Get all restaurants for a specific mall with optional filtering by category and pagination.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: mallId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mall ID"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: "Filter by main category (optional)"
 *         example: "CHINESE"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "Page number for pagination (optional, default: 1)"
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: "Number of items per page (optional, default: 10)"
 *         example: 10
 *     responses:
 *       200:
 *         description: List of restaurants with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       restaurantId:
 *                         type: string
 *                         description: "Restaurant ID (same as userId)"
 *                       userId:
 *                         type: string
 *                       mallId:
 *                         type: string
 *                       mallName:
 *                         type: string
 *                         nullable: true
 *                         description: "Name of the mall where the restaurant is located"
 *                       membershipPlan:
 *                         type: string
 *                         nullable: true
 *                         description: "Active membership plan name"
 *                       name:
 *                         type: string
 *                         nullable: true
 *                       mainCategory:
 *                         type: string
 *                       banner:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       story:
 *                         type: string
 *                         nullable: true
 *                       location:
 *                         type: string
 *                         nullable: true
 *                       cuisineCategoryId:
 *                         type: string
 *                         nullable: true
 *                       isFavorite:
 *                         type: boolean
 *                         description: "Whether the restaurant is featured/favorite"
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           image:
 *                             type: string
 *                             nullable: true
 *                 total:
 *                   type: integer
 *                   description: Total number of restaurants
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Items per page
 *       400:
 *         description: Invalid mall ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/restaurant/get-all/:mallId", restaurantController.getAll);

/**
 * @swagger
 * /restaurants/all:
 *   get:
 *     summary: Get all restaurants system-wide with pagination
 *     tags: [Restaurants]
 *     description: |
 *       Get all restaurants in the system with pagination, optional filtering by mall or category.
 *       Returns publicly available restaurant details including owner info (without sensitive data), mall info, and basic statistics.
 *       This is a public endpoint accessible to all users.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: "Page number for pagination (default: 1)"
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: "Number of results per page (default: 10, max: 100)"
 *         example: 10
 *       - in: query
 *         name: mallId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by mall ID (optional)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by main category (optional)
 *         example: "CHINESE"
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurants retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           restaurantId:
 *                             type: string
 *                           userId:
 *                             type: string
 *                           mallId:
 *                             type: string
 *                           mallName:
 *                             type: string
 *                             nullable: true
 *                           membershipPlan:
 *                             type: string
 *                             nullable: true
 *                           name:
 *                             type: string
 *                           mainCategory:
 *                             type: string
 *                           banner:
 *                             type: string
 *                             nullable: true
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           story:
 *                             type: string
 *                             nullable: true
 *                           location:
 *                             type: string
 *                             nullable: true
 *                           cuisineCategoryId:
 *                             type: string
 *                             nullable: true
 *                           cuisineCategory:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           isFavorite:
 *                             type: boolean
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               image:
 *                                 type: string
 *                                 nullable: true
 *                           mall:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               cityId:
 *                                 type: string
 *                           statistics:
 *                             type: object
 *                             properties:
 *                               totalOrders:
 *                                 type: integer
 *                               totalMenuCategories:
 *                                 type: integer
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 */
// Public route - no authentication required
router.get("/restaurants/all", restaurantController.getAllSystemWide);

/**
 * @swagger
 * /restaurant/get-details/{restaurantId}:
 *   get:
 *     summary: Get full restaurant details
 *     tags: [Restaurants]
 *     description: |
 *       Get complete restaurant details including user info, menu categories, and all menu items.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 mallId:
 *                   type: string
 *                 name:
 *                   type: string
 *                   nullable: true
 *                 mainCategory:
 *                   type: string
 *                 banner:
 *                   type: string
 *                   nullable: true
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 story:
 *                   type: string
 *                   nullable: true
 *                 location:
 *                   type: string
 *                   nullable: true
 *                 cuisineCategoryId:
 *                   type: string
 *                   nullable: true
 *                 isFavorite:
 *                   type: boolean
 *                   description: "Whether the restaurant is featured/favorite"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     image:
 *                       type: string
 *                       nullable: true
 *                 menuCategories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                               nullable: true
 *                             price:
 *                               type: number
 *                             preparationTime:
 *                               type: string
 *                               nullable: true
 *                             image:
 *                               type: string
 *                               nullable: true
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/restaurant/get-details/:restaurantId", restaurantController.getDetails);

/**
 * @swagger
 * /restaurant/update/{restaurantId}:
 *   patch:
 *     summary: Update a restaurant
 *     tags: [Restaurants]
 *     description: |
 *       Update a restaurant. You can either upload a banner image file or provide a banner URL.
 *       **All fields are optional** - send only the fields you want to update.
 *       **Banner upload:** Use multipart/form-data with field name "banner" to upload a file.
 *       If both file and URL are provided, the uploaded file takes priority.
 *       **Accepted image formats:** JPEG, PNG, GIF, WebP
 *       **Maximum file size:** 5MB
 *       **Note:** userId cannot be updated (it's the primary key).
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               mallId:
 *                 type: string
 *                 description: "Mall ID (required)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 description: "Restaurant name (optional)"
 *                 example: "Rozna Restaurant"
 *               mainCategory:
 *                 type: string
 *                 description: "Main cuisine category (optional)"
 *                 example: "INDIAN"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: "Restaurant banner image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *               description:
 *                 type: string
 *                 description: "Restaurant description (optional)"
 *                 example: "Updated description"
 *               story:
 *                 type: string
 *                 description: "Restaurant story/intro (optional)"
 *                 example: "Family recipes since 1990"
 *               location:
 *                 type: string
 *                 description: "Restaurant location within the mall (optional)"
 *                 example: "Food Court, Level 3"
 *               cuisineCategoryId:
 *                 type: string
 *                 description: "Cuisine category ID (optional)"
 *                 example: "123e4567-e89b-12d3-a456-426614174999"
 *               isFavorite:
 *                 type: boolean
 *                 description: "Mark as featured/favorite (optional)"
 *                 example: false
 *           examples:
 *             updateDescription:
 *               summary: Update only description
 *               value:
 *                 description: "Updated restaurant description"
 *             updateCategory:
 *               summary: Update only category
 *               value:
 *                 mainCategory: "INDIAN"
 *             updateWithBanner:
 *               summary: Update with banner file
 *               value:
 *                 description: "Updated description"
 *                 banner: "<file>"
 *             updateWithBannerUrl:
 *               summary: Update with banner URL
 *               value:
 *                 banner: "https://example.com/new-banner.jpg"
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                 mallId:
 *                   type: string
 *                 name:
 *                   type: string
 *                   nullable: true
 *                 mainCategory:
 *                   type: string
 *                 banner:
 *                   type: string
 *                   nullable: true
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 story:
 *                   type: string
 *                   nullable: true
 *                 location:
 *                   type: string
 *                   nullable: true
 *                 cuisineCategoryId:
 *                   type: string
 *                   nullable: true
 *                 isFavorite:
 *                   type: boolean
 *                   description: "Whether the restaurant is featured/favorite"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Restaurant management routes - require restaurant role and ownership
router.patch("/restaurant/update/:restaurantId", requireAuth, requireRestaurantRole, requireRestaurantOwnership, uploadRestaurantBanner.single("banner"), restaurantController.update);

/**
 * @swagger
 * /restaurant/delete/{restaurantId}:
 *   delete:
 *     summary: Delete a restaurant
 *     tags: [Restaurants]
 *     description: |
 *       Delete a restaurant. If the restaurant has a banner, it will be automatically deleted from storage.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Restaurant deleted successfully (no content)
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/restaurant/delete/:restaurantId", requireAuth, requireRestaurantRole, requireRestaurantOwnership, restaurantController.delete);

/**
 * @swagger
 * /restaurant/get-menu/{restaurantId}:
 *   get:
 *     summary: Get full restaurant menu
 *     tags: [Restaurants]
 *     description: |
 *       Get complete restaurant information with structured menu data (categories and items).
 *       This endpoint provides a formatted response with restaurant info and menu structure.
 *       **No request body required.**
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Restaurant ID (same as userId)"
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Restaurant menu retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                       description: Restaurant name (from user table)
 *                     profilePic:
 *                       type: string
 *                       nullable: true
 *                       description: Restaurant profile picture (from user table)
 *                     banner:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     story:
 *                       type: string
 *                       nullable: true
 *                     location:
 *                       type: string
 *                       nullable: true
 *                     mainCategory:
 *                       type: string
 *                     cuisineCategoryId:
 *                       type: string
 *                       nullable: true
 *                     isFavorite:
 *                       type: boolean
 *                       description: "Whether the restaurant is featured/favorite"
 *                 menu:
 *                   type: array
 *                   description: Menu categories with items
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                               nullable: true
 *                             price:
 *                               type: number
 *                             preparationTime:
 *                               type: string
 *                               nullable: true
 *                             image:
 *                               type: string
 *                               nullable: true
 *       400:
 *         description: Invalid restaurant ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restaurant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/restaurant/get-menu/:restaurantId", restaurantController.getFullMenu);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders:
 *   get:
 *     summary: Get all orders for restaurant
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Get all orders for a restaurant with optional status filtering and pagination.
 *       Shows order summaries with customer info, items, and total amount.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (same as user ID for restaurant)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - ACCEPTED
 *             - PREPARING
 *             - READY
 *             - OUT_FOR_DELIVERY
 *             - DELIVERED
 *             - CANCELLED
 *         description: Filter orders by status
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to fetch per page
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip for pagination
 *     responses:
 *       200:
 *         description: Restaurant orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           orderNumber:
 *                             type: string
 *                           customerName:
 *                             type: string
 *                           customerPhone:
 *                             type: string
 *                             nullable: true
 *                           status:
 *                             type: string
 *                             enum: [PENDING, ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED]
 *                           totalAmount:
 *                             type: number
 *                           paymentMethod:
 *                             type: string
 *                           deliveryAddress:
 *                             type: string
 *                           deliveryCity:
 *                             type: string
 *                           estimatedDeliveryTime:
 *                             type: string
 *                             nullable: true
 *                           specialInstructions:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 quantity:
 *                                   type: integer
 *                                 unitPrice:
 *                                   type: number
 *                                 totalPrice:
 *                                   type: number
 *                                 image:
 *                                   type: string
 *                                   nullable: true
 *                           itemCount:
 *                             type: integer
 *                     total:
 *                       type: integer
 *                       description: Total number of orders
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Restaurant not found
 */
// Restaurant order routes - require restaurant role and ownership
router.get("/restaurants/:restaurantId/orders", requireAuth, requireRestaurantRole, requireRestaurantOwnership, restaurantController.getRestaurantOrders);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders/{orderId}:
 *   get:
 *     summary: Get detailed order information
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Get complete details of a single order including customer info, items with variations/add-ons,
 *       delivery address, and payment details.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174111"
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     subtotal:
 *                       type: number
 *                     tax:
 *                       type: number
 *                     deliveryFee:
 *                       type: number
 *                     discount:
 *                       type: number
 *                     paymentMethod:
 *                       type: string
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phoneNumber:
 *                           type: string
 *                           nullable: true
 *                         image:
 *                           type: string
 *                           nullable: true
 *                     deliveryAddress:
 *                       type: object
 *                       properties:
 *                         label:
 *                           type: string
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                         postalCode:
 *                           type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           unitPrice:
 *                             type: number
 *                           totalPrice:
 *                             type: number
 *                           image:
 *                             type: string
 *                             nullable: true
 *                           specialNotes:
 *                             type: string
 *                             nullable: true
 *                           selectedVariations:
 *                             type: object
 *                             nullable: true
 *                           selectedAddOns:
 *                             type: object
 *                             nullable: true
 *       400:
 *         description: Invalid order or restaurant ID
 *       403:
 *         description: Order does not belong to this restaurant
 *       404:
 *         description: Order not found
 */
router.get("/restaurants/:restaurantId/orders/:orderId", requireAuth, requireRestaurantRole, requireRestaurantOwnership, restaurantController.getRestaurantOrderDetails);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders/{orderId}/accept:
 *   post:
 *     summary: Accept a pending order
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Accept a pending order. Order must be in PENDING status to be accepted.
 *       This transitions the order to ACCEPTED status.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     customerName:
 *                       type: string
 *       400:
 *         description: Invalid request or order cannot be accepted
 *       404:
 *         description: Order not found
 */
router.post("/restaurants/:restaurantId/orders/:orderId/accept", requireAuth, requireRestaurantRole, requireRestaurantOwnership, restaurantController.acceptOrder);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders/{orderId}/decline:
 *   post:
 *     summary: Decline a pending or accepted order
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Decline an order with a reason. Order must be in PENDING or ACCEPTED status.
 *       This transitions the order to CANCELLED status with the decline reason stored.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Reason for declining the order
 *                 example: "Out of stock for this item"
 *     responses:
 *       200:
 *         description: Order declined successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     customerName:
 *                       type: string
 *                     reason:
 *                       type: string
 *       400:
 *         description: Invalid request or order cannot be declined
 *       404:
 *         description: Order not found
 */
router.post("/restaurants/:restaurantId/orders/:orderId/decline", requireAuth, requireRestaurantRole, requireRestaurantOwnership, restaurantController.declineOrder);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Update the status of an order. Valid status transitions:
 *       - **PENDING** → ACCEPTED or REJECTED
 *       - **ACCEPTED** → PREPARING or CANCELLED
 *       - **PREPARING** → READY
 *       - **READY** → OUT_FOR_DELIVERY
 *       - **OUT_FOR_DELIVERY** → DELIVERED
 *       
 *       **Note:** Use REJECTED status to reject a pending order. This is an alternative
 *       to using the `/decline` endpoint. When an order is rejected, the customer will
 *       be notified and any payment will be refunded if applicable.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (must match authenticated restaurant)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID to update
 *         example: "123e4567-e89b-12d3-a456-426614174001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, REJECTED]
 *                 description: |
 *                   New order status. Valid values:
 *                   - **ACCEPTED**: Order accepted by restaurant (from PENDING)
 *                   - **REJECTED**: Order rejected by restaurant (from PENDING)
 *                   - **PREPARING**: Food is being prepared (from ACCEPTED)
 *                   - **READY**: Order is ready for pickup/delivery (from PREPARING)
 *                   - **OUT_FOR_DELIVERY**: Order is out for delivery (from READY)
 *                   - **DELIVERED**: Order has been delivered (from OUT_FOR_DELIVERY)
 *                 example: "READY"
 *               estimatedDeliveryTime:
 *                 type: string
 *                 description: "Optional estimated delivery time (format: HH:MM AM/PM)"
 *                 example: "05:30 PM"
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order status updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, REJECTED]
 *                     customerName:
 *                       type: string
 *                     estimatedDeliveryTime:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid status transition or request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid status transition from PENDING to DELIVERED"
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 *       500:
 *         description: Internal server error
 */
router.patch("/restaurants/:restaurantId/orders/:orderId/status", requireAuth, requireRestaurantRole, requireRestaurantOwnership, restaurantController.updateOrderStatus);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders/{orderId}/payment-status:
 *   patch:
 *     summary: Update payment status for COD orders
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Update payment status for Cash on Delivery (COD) orders. Used for:
 *       - Marking payment as not collected (PENDING)
 *       - Marking payment as collected (PAID) - if missed during delivery
 *       - Processing refunds (REFUNDED) - for disputes or issues
 *       - Marking payment as failed (FAILED)
 *       
 *       **Note:** This endpoint is only for COD orders. Card payments are handled automatically via Stripe.
 *       
 *       **Valid Status Transitions:**
 *       - PENDING → PAID, FAILED
 *       - PAID → REFUNDED, PENDING
 *       - FAILED → PAID, PENDING
 *       - REFUNDED → (final state, cannot change)
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (must match authenticated restaurant)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID to update
 *         example: "123e4567-e89b-12d3-a456-426614174001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [PENDING, PAID, FAILED, REFUNDED]
 *                 description: |
 *                   New payment status:
 *                   - **PENDING**: Payment not collected (e.g., delivery person forgot)
 *                   - **PAID**: Payment collected (e.g., marked after delivery)
 *                   - **FAILED**: Payment collection failed
 *                   - **REFUNDED**: Payment refunded (for disputes)
 *                 example: "REFUNDED"
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional reason for the payment status change
 *                 example: "Customer dispute - wrong order delivered"
 *           examples:
 *             markNotPaid:
 *               summary: Mark payment as not collected
 *               value:
 *                 paymentStatus: "PENDING"
 *                 reason: "Delivery person forgot to collect payment"
 *             markPaid:
 *               summary: Mark payment as collected
 *               value:
 *                 paymentStatus: "PAID"
 *                 reason: "Payment collected after delivery, updating status"
 *             refund:
 *               summary: Process refund for dispute
 *               value:
 *                 paymentStatus: "REFUNDED"
 *                 reason: "Customer dispute - wrong items delivered"
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment status updated to REFUNDED successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                       enum: [PENDING, PAID, FAILED, REFUNDED]
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: Invalid request, status transition, or not a COD order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Invalid payment status transition from PAID to PENDING"
 *                     - "Payment status updates are only allowed for COD (CASH) orders"
 *                     - "Can only refund orders that are marked as PAID"
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/restaurants/:restaurantId/orders/:orderId/payment-status",
  requireAuth,
  requireRestaurantRole,
  requireRestaurantOwnership,
  restaurantController.updatePaymentStatus
);

/**
 * @swagger
 * /restaurants/{restaurantId}/analytics/orders-revenue:
 *   get:
 *     summary: Get restaurant analytics (orders and revenue)
 *     tags: [Restaurants]
 *     description: |
 *       Get all orders and revenue statistics for a specific restaurant with pagination.
 *       Returns complete order details along with revenue summaries.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (same as user ID for restaurant)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: "Page number for pagination (default: 1)"
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: "Number of results per page (default: 10, max: 100)"
 *         example: 10
 *     responses:
 *       200:
 *         description: Restaurant analytics retrieved successfully
 *       404:
 *         description: Restaurant not found
 */
// Restaurant analytics - restaurants can view their own, admins can view any
router.get(
  "/restaurants/:restaurantId/analytics/orders-revenue",
  requireAuth,
  requireRole("ADMIN", "RESTAURANT"),
  restaurantController.getRestaurantAnalytics
);


export default router;
