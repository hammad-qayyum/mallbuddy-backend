import { Router } from "express";
import { restaurantController } from "./restaurant.controller";
import { uploadRestaurantBanner } from "../../config/upload";

const router = Router();

/**
 * @swagger
 * /restaurant/create:
 *   post:
 *     summary: Create a new restaurant
 *     tags: [Restaurants]
 *     description: |
 *       Create a new restaurant. You can either upload a banner image file or provide a banner URL.
 *       **Required fields:** userId, mallId
 *       **Optional fields:** name, mainCategory, banner (URL or file upload), description, story, location, cuisineCategoryId, isFavorite
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
 *             required: [userId, mallId]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: "User ID (must be a valid user ID, becomes the restaurant's primary key)"
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               mallId:
 *                 type: string
 *                 description: Mall ID where the restaurant is located
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 description: "Restaurant name (optional)"
 *                 example: "Rozna Restaurant"
 *               mainCategory:
 *                 type: string
 *                 description: "Main cuisine category (e.g., 'CHINESE', 'INDIAN', 'ITALIAN')"
 *                 example: "CHINESE"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: "Restaurant banner image file (optional, JPEG, PNG, GIF, or WebP, max 5MB)"
 *               description:
 *                 type: string
 *                 description: "Restaurant description (optional)"
 *                 example: "Authentic Chinese cuisine"
 *               story:
 *                 type: string
 *                 description: "Restaurant story/intro (optional)"
 *                 example: "Family recipes since 1990"
 *               location:
 *                 type: string
 *                 description: "Restaurant location within the mall (optional)"
 *                 example: "Food Court, Level 2"
 *               cuisineCategoryId:
 *                 type: string
 *                 description: "Cuisine category ID (optional)"
 *                 example: "123e4567-e89b-12d3-a456-426614174999"
 *               isFavorite:
 *                 type: boolean
 *                 description: "Mark as featured/favorite (optional)"
 *                 example: false
 *           examples:
 *             withFileUpload:
 *               summary: Create with banner file upload
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Rozna Restaurant"
 *                 mainCategory: "CHINESE"
 *                 description: "Authentic Chinese cuisine"
 *                 story: "Family recipes since 1990"
 *                 location: "Food Court, Level 2"
 *                 banner: "<file>"
 *             withBannerUrl:
 *               summary: Create with banner URL
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mainCategory: "CHINESE"
 *                 description: "Authentic Chinese cuisine"
 *                 location: "Food Court, Level 2"
 *                 banner: "https://example.com/restaurant-banner.jpg"
 *             withoutBanner:
 *               summary: Create without banner
 *               value:
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mallId: "123e4567-e89b-12d3-a456-426614174000"
 *                 mainCategory: "CHINESE"
 *                 description: "Authentic Chinese cuisine"
 *                 location: "Food Court, Level 2"
 *     responses:
 *       201:
 *         description: Restaurant created successfully
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
 *                   description: URL to the restaurant banner (if provided)
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
 *         description: Validation error or failed to create restaurant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post("/restaurant/create", uploadRestaurantBanner.single("banner"), restaurantController.create);

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
 *                       userId:
 *                         type: string
 *                       mallId:
 *                         type: string
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
router.patch("/restaurant/update/:restaurantId", uploadRestaurantBanner.single("banner"), restaurantController.update);

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
router.delete("/restaurant/delete/:restaurantId", restaurantController.delete);

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
router.get("/restaurants/:restaurantId/orders", restaurantController.getRestaurantOrders);

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
router.get("/restaurants/:restaurantId/orders/:orderId", restaurantController.getRestaurantOrderDetails);

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
router.post("/restaurants/:restaurantId/orders/:orderId/accept", restaurantController.acceptOrder);

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
router.post("/restaurants/:restaurantId/orders/:orderId/decline", restaurantController.declineOrder);

/**
 * @swagger
 * /restaurants/{restaurantId}/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders - Restaurant Screen]
 *     description: |
 *       Update the status of an order. Valid transitions:
 *       - PENDING → ACCEPTED
 *       - ACCEPTED → PREPARING or CANCELLED
 *       - PREPARING → READY
 *       - READY → OUT_FOR_DELIVERY
 *       - OUT_FOR_DELIVERY → DELIVERED
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED]
 *                 description: New order status
 *                 example: "READY"
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
 *         description: Invalid status transition or request
 *       404:
 *         description: Order not found
 */
router.patch("/restaurants/:restaurantId/orders/:orderId/status", restaurantController.updateOrderStatus);

export default router;
