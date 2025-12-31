import { Router } from "express";
import { trackOrderController } from "./track-order.controller";
import { requireAuth, requireUserRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /track-order/{orderId}:
 *   get:
 *     summary: Get complete order tracking information
 *     tags: [Track Order]
 *     description: |
 *       Retrieve full tracking information for an order including:
 *       - Current status with timeline of all status changes
 *       - Restaurant details
 *       - Delivery address
 *       - Order items
 *       - Estimated and actual delivery times
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID to track
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Order tracking information retrieved successfully
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
 *                 currentStatus:
 *                   type: string
 *                   enum:
 *                     - PENDING
 *                     - ACCEPTED
 *                     - PREPARING
 *                     - READY
 *                     - OUT_FOR_DELIVERY
 *                     - DELIVERED
 *                     - CANCELLED
 *                   example: "PREPARING"
 *                 estimatedDeliveryTime:
 *                   type: string
 *                   example: "05:00 PM"
 *                 actualDeliveryTime:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 specialInstructions:
 *                   type: string
 *                   nullable: true
 *                 restaurant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     location:
 *                       type: string
 *                 deliveryAddress:
 *                   type: object
 *                   properties:
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
 *                       name:
 *                         type: string
 *                       quantity:
 *                         type: integer
 *                       image:
 *                         type: string
 *                 statusTimeline:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                       label:
 *                         type: string
 *                       time:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       isCompleted:
 *                         type: boolean
 *                       isActive:
 *                         type: boolean
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
// Track order routes require authenticated user
router.get("/:orderId", requireAuth, requireUserRole, trackOrderController.getOrderTracking);

/**
 * @swagger
 * /track-order/status/{orderId}:
 *   get:
 *     summary: Get current order status only
 *     tags: [Track Order]
 *     description: |
 *       Get a quick status check of an order. Returns only essential status information
 *       without detailed tracking information. Use this for frequent polling or status updates.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID to check
 *     responses:
 *       200:
 *         description: Order status retrieved successfully
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
 *                   enum:
 *                     - PENDING
 *                     - ACCEPTED
 *                     - PREPARING
 *                     - READY
 *                     - OUT_FOR_DELIVERY
 *                     - DELIVERED
 *                     - CANCELLED
 *                 estimatedDeliveryTime:
 *                   type: string
 *                 actualDeliveryTime:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get("/status/:orderId", requireAuth, requireUserRole, trackOrderController.getOrderStatus);

export default router;
