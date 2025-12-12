import { Router } from "express";
import { orderDetailController } from "./order-detail.controller";

const router = Router();

/**
 * @swagger
 * /order-detail/{orderId}:
 *   get:
 *     summary: Get detailed order information
 *     tags: [Order Details]
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
router.get("/:orderId", orderDetailController.getOrderDetails);

/**
 * @swagger
 * /order-detail/summary/{orderId}:
 *   get:
 *     summary: Get order summary (quick view)
 *     tags: [Order Details]
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
router.get("/summary/:orderId", orderDetailController.getOrderSummary);

/**
 * @swagger
 * /order-detail/user/{userId}:
 *   get:
 *     summary: Get all orders for a user
 *     tags: [Order Details]
 *     description: Retrieve all orders for a specific user with pagination and optional filtering by status.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: Filter by order status
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of orders to retrieve
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: User orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       orderNumber:
 *                         type: string
 *                       status:
 *                         type: string
 *                       restaurantName:
 *                         type: string
 *                       itemCount:
 *                         type: integer
 *                       total:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       paymentMethod:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.get("/user/:userId", orderDetailController.getUserOrders);

export default router;
