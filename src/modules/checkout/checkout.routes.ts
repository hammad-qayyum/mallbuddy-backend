import { Router } from "express";
import { checkoutController } from "./checkout.controller";
import { requireAuth, requireUserRole } from "../../middlewares/role.middleware";

const router = Router();


// Apply user role to all checkout routes (requireAuth is applied globally)
router.use(requireUserRole,requireAuth);

/**
 * @swagger
 * /checkout/summary:
 *   get:
 *     summary: Get checkout summary
 *     tags: [Checkout]
 *     description: |
 *       Retrieve cart summary including items grouped by restaurant, subtotal, and saved addresses.
 *       Used to display the checkout page.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Checkout summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subtotal:
 *                   type: number
 *                   example: 13.20
 *                 itemsByRestaurant:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       restaurantId:
 *                         type: string
 *                       restaurantName:
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
 *                             quantity:
 *                               type: integer
 *                             price:
 *                               type: number
 *                             total:
 *                               type: number
 *                 addresses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       label:
 *                         type: string
 *                       address:
 *                         type: string
 *                       isDefault:
 *                         type: boolean
 *       400:
 *         description: Cart is empty
 *       500:
 *         description: Internal server error
 */
router.get("/summary", checkoutController.getCheckoutSummary);

/**
 * @swagger
 * /checkout/addresses:
 *   get:
 *     summary: Get user's delivery addresses
 *     tags: [Checkout]
 *     description: Retrieve all saved delivery addresses for the user.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   label:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   isDefault:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/addresses", checkoutController.getUserDeliveryAddresses);

/**
 * @swagger
 * /checkout/address:
 *   post:
 *     summary: Add new delivery address
 *     tags: [Checkout]
 *     description: Add a new delivery address for the user.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *             properties:
 *               label:
 *                 type: string
 *                 description: Label for address (e.g., "Home", "Office")
 *                 example: "Home"
 *               address:
 *                 type: string
 *                 description: Full address
 *                 example: "123 Main St, Apartment 4B"
 *               city:
 *                 type: string
 *                 example: "Casablanca"
 *               postalCode:
 *                 type: string
 *                 example: "20000"
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default address
 *                 example: true
 *     responses:
 *       201:
 *         description: Address added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post("/address", checkoutController.addDeliveryAddress);

/**
 * @swagger
 * /checkout/create-order:
 *   post:
 *     summary: Create order from cart
 *     tags: [Checkout]
 *     description: |
 *       Create an order from the user's cart. 
 *       This will clear the cart after successful order creation.
 *       All items must be from the same restaurant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - deliveryAddressId
 *               - paymentMethod
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               deliveryAddressId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the delivery address
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               paymentMethod:
 *                 type: string
 *                 enum:
 *                   - CASH
 *                   - CARD
 *                   - WALLET
 *                   - ONLINE
 *                 description: Payment method
 *                 example: "CASH"
 *               specialInstructions:
 *                 type: string
 *                 description: Special instructions for the order
 *                 example: "Ring doorbell twice"
 *               promoCodeId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional promo code ID to apply discount
 *                 example: "123e4567-e89b-41d4-a716-446655440000"
 *               deliveryFee:
 *                 type: number
 *                 minimum: 0
 *                 description: Delivery fee amount
 *                 example: 2.50
 *               tax:
 *                 type: number
 *                 minimum: 0
 *                 description: Tax amount
 *                 example: 1.50
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                       example: "#1234AB"
 *                     userId:
 *                       type: string
 *                     restaurantId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum:
 *                         - PENDING
 *                         - ACCEPTED
 *                         - PREPARING
 *                         - READY
 *                         - OUT_FOR_DELIVERY
 *                         - DELIVERED
 *                         - CANCELLED
 *                     subtotal:
 *                       type: number
 *                     tax:
 *                       type: number
 *                     deliveryFee:
 *                       type: number
 *                     discount:
 *                       type: number
 *                     total:
 *                       type: number
 *                     promoCodeId:
 *                       type: string
 *                       format: uuid
 *                       description: Applied promo code ID (if any)
 *                       example: "123e4567-e89b-41d4-a716-446655440000"
 *                     paymentMethod:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           orderId:
 *                             type: string
 *                           menuItemId:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           unitPrice:
 *                             type: string
 *                           totalPrice:
 *                             type: string
 *                           itemName:
 *                             type: string
 *                           specialNotes:
 *                             type: string
 *                             nullable: true
 *                           selectedVariations:
 *                             type: object
 *                             nullable: true
 *                           selectedAddOns:
 *                             type: object
 *                             nullable: true
 *                           menuItem:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                               price:
 *                                 type: string
 *                               image:
 *                                 type: string
 *                                 nullable: true
 *                     restaurant:
 *                       type: object
 *                       description: Restaurant information (only essential fields)
 *                       properties:
 *                         userId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         mainCategory:
 *                           type: string
 *                         banner:
 *                           type: string
 *                           nullable: true
 *                         estimatedDeliveryTime:
 *                           type: string
 *                           nullable: true
 *                     deliveryAddress:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         label:
 *                           type: string
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                         postalCode:
 *                           type: string
 *                         isDefault:
 *                           type: boolean
 *                     user:
 *                       type: object
 *                       description: User information (only essential fields)
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phoneNumber:
 *                           type: string
 *                         image:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: Invalid request or cart empty
 *       404:
 *         description: Address or item not found
 *       500:
 *         description: Internal server error
 */
router.post("/create-order", checkoutController.createOrder);

export default router;
