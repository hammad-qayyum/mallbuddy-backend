import express, { Router } from "express";
import { ordersController } from "./orders.controller";
import { stripeWebhookHandler } from "../payments/stripe-webhooks/stripe.webhook";
import { requireAuth, requireUserRole, requireRestaurantRole, requireRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /orders/list:
 *   get:
 *     summary: Get all orders for a user
 *     tags: [Orders]
 *     description: |
 *       Retrieve all orders for a specific user with optional status filtering.
 *       Supports pagination with limit and offset.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user-uuid-1234"
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
 *         description: Number of records to fetch
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
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
 *                           restaurantName:
 *                             type: string
 *                           restaurantImage:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           itemCount:
 *                             type: integer
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
 *                                 image:
 *                                   type: string
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
// User routes - require authentication and user role
router.get("/list", requireAuth, requireUserRole, ordersController.getUserOrders);

/**
 * @swagger
 * /orders/active:
 *   get:
 *     summary: Get active orders
 *     tags: [Orders]
 *     description: |
 *       Retrieve active orders that are still being processed (PENDING, ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY).
 *       These are orders that haven't been delivered or cancelled yet.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user-uuid-1234"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to fetch
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Active orders retrieved successfully
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
 *                           restaurantName:
 *                             type: string
 *                           restaurantImage:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           estimatedDeliveryTime:
 *                             type: string
 *                           itemCount:
 *                             type: integer
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.get("/active", requireAuth, requireUserRole, ordersController.getActiveOrders);

/**
 * @swagger
 * /orders/past:
 *   get:
 *     summary: Get past orders
 *     tags: [Orders]
 *     description: |
 *       Retrieve past orders that have been completed (DELIVERED) or cancelled (CANCELLED).
 *       These orders can be reordered from.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user-uuid-1234"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to fetch
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Past orders retrieved successfully
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
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.get("/past", requireAuth, requireUserRole, ordersController.getPastOrders);

/**
 * @swagger
 * /orders/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     description: |
 *       Cancel an active order with a cancellation reason.
 *       Order must be in an active state (not already delivered or cancelled).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - userId
 *               - reason
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Order ID to cancel
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               userId:
 *                 type: string
 *                 description: User ID (must match order owner)
 *                 example: "user-uuid-1234"
 *               reason:
 *                 type: string
 *                 description: Cancellation reason (3-500 characters)
 *                 example: "Changed my mind"
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order cancelled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "CANCELLED"
 *                     reason:
 *                       type: string
 *       400:
 *         description: Invalid request or order cannot be cancelled
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post("/cancel", requireAuth, requireUserRole, ordersController.cancelOrder);

/**
 * @swagger
 * /orders/reorder:
 *   post:
 *     summary: Reorder items from a past order
 *     tags: [Orders]
 *     description: |
 *       Add all items from a past order to the user's cart.
 *       Only works for orders in DELIVERED or CANCELLED state.
 *       Creates a new cart if needed.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - userId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Order ID to reorder from
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "user-uuid-1234"
 *     responses:
 *       201:
 *         description: Items added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Items added to cart successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cartId:
 *                       type: string
 *                     itemsAdded:
 *                       type: integer
 *                       example: 3
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
 *       400:
 *         description: Invalid request or order cannot be reordered
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post("/reorder", requireAuth, requireUserRole, ordersController.reorder);

/**
 * @swagger
 * /orders/cancellation-reasons:
 *   get:
 *     summary: Get cancellation reasons
 *     tags: [Orders]
 *     description: |
 *       Retrieve a list of common cancellation reasons to display in the UI.
 *       Users can select from these predefined reasons or provide a custom reason.
 *     responses:
 *       200:
 *         description: Cancellation reasons retrieved successfully
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
 *                     reasons:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           label:
 *                             type: string
 *                           value:
 *                             type: string
 *       500:
 *         description: Server error
 */
router.get("/cancellation-reasons", requireAuth, requireUserRole, ordersController.getCancellationReasons);

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     summary: Get detailed order information
 *     tags: [Orders]
 *     description: |
 *       Retrieve complete order details including all items, restaurant information,
 *       delivery address, pricing breakdown, and order status.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 orderNumber:
 *                   type: string
 *                   example: "#1234"
 *                 status:
 *                   type: string
 *                   enum:
 *                     - PENDING
 *                     - ACCEPTED
 *                     - PREPARING
 *                     - READY
 *                     - OUT_FOR_DELIVERY
 *                     - DELIVERED
 *                     - CANCELLED
 *                 paymentMethod:
 *                   type: string
 *                   enum:
 *                     - CASH
 *                     - CARD
 *                     - WALLET
 *                     - ONLINE
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     image:
 *                       type: string
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     banner:
 *                       type: string
 *                     description:
 *                       type: string
 *                     location:
 *                       type: string
 *                     mall:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                 deliveryAddress:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       itemName:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       unitPrice:
 *                         type: number
 *                       totalPrice:
 *                         type: number
 *                       specialNotes:
 *                         type: string
 *                       image:
 *                         type: string
 *                 pricing:
 *                   type: object
 *                   properties:
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
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /orders/restaurant/{restaurantId}/accepted:
 *   get:
 *     summary: Get accepted orders (order queue)
 *     tags: [Orders]
 *     description: |
 *       Get all orders with status ACCEPTED for a restaurant. This is the order queue showing orders that are being prepared.
 *       Orders are sorted by creation time (oldest first) to show the queue order.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: "Maximum number of orders to return (default: 50)"
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: "Number of orders to skip for pagination (default: 0)"
 *     responses:
 *       200:
 *         description: Accepted orders retrieved successfully
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
 *                           customerImage:
 *                             type: string
 *                           status:
 *                             type: string
 *                             example: "ACCEPTED"
 *                           totalAmount:
 *                             type: number
 *                           subtotal:
 *                             type: number
 *                           tax:
 *                             type: number
 *                           deliveryFee:
 *                             type: number
 *                           discount:
 *                             type: number
 *                           paymentMethod:
 *                             type: string
 *                           deliveryAddress:
 *                             type: string
 *                           deliveryCity:
 *                             type: string
 *                           deliveryLabel:
 *                             type: string
 *                           estimatedDeliveryTime:
 *                             type: string
 *                           specialInstructions:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                           itemCount:
 *                             type: integer
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Restaurant not found
 */
// Restaurant routes - require authentication and restaurant role
router.get("/restaurant/:restaurantId/accepted", requireAuth, requireRestaurantRole, ordersController.getAcceptedOrders);

// Both users and restaurants can view order details
router.get("/:orderId", requireAuth, requireRole("USER", "RESTAURANT"), ordersController.getOrderDetails);

/**
 * @swagger
 * /orders/summary/{orderId}:
 *   get:
 *     summary: Get order summary (quick view)
 *     tags: [Orders]
 *     description: |
 *       Retrieve a quick summary of an order with essential information.
 *       Use this when you need minimal order information.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Order summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 orderNumber:
 *                   type: string
 *                 status:
 *                   type: string
 *                 restaurantName:
 *                   type: string
 *                 itemCount:
 *                   type: integer
 *                 total:
 *                   type: number
 *                 paymentMethod:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 estimatedDeliveryTime:
 *                   type: string
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get("/summary/:orderId", requireAuth, requireRole("USER", "RESTAURANT"), ordersController.getOrderSummary);

/**
 * @swagger
 * /orders/{orderId}/reorder-preview:
 *   get:
 *     summary: Get order details for reorder preview
 *     tags: [Orders]
 *     description: |
 *       Retrieve detailed information about a past order for displaying
 *       as a preview before reordering.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (for authorization)
 *         example: "user-uuid-1234"
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
 *                     restaurantName:
 *                       type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           menuItemId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           quantity:
 *                             type: integer
 *                           price:
 *                             type: number
 *                           image:
 *                             type: string
 *                     total:
 *                       type: number
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Unauthorized - order does not belong to user
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get("/:orderId/reorder-preview", requireAuth, requireUserRole, ordersController.getOrderForReorder);


router.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );

export default router;
