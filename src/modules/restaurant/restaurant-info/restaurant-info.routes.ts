import { Router } from "express";
import restaurantInfoController from "./restaurant-info.controller";

const router = Router();

/**
 * @swagger
 * /restaurant/{restaurantId}/info:
 *   get:
 *     summary: Get restaurant information
 *     tags: [Restaurant Info]
 *     description: Get restaurant personal information including address, phone, delivery time, and business hours. Public endpoint - anyone can view.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (same as userId)
 *     responses:
 *       200:
 *         description: Restaurant information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RestaurantInfo'
 *       404:
 *         description: Restaurant not found
 */
router.get("/restaurant/:restaurantId/info", restaurantInfoController.getInfo);

/**
 * @swagger
 * /restaurant/{restaurantId}/info:
 *   patch:
 *     summary: Update restaurant information
 *     tags: [Restaurant Info]
 *     description: Update restaurant personal information. Only the restaurant owner can update.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (must match authenticated user)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 example: "1249 Address"
 *               phoneNumber:
 *                 type: string
 *                 example: "+0 (000) 000-0000"
 *               estimatedDeliveryTime:
 *                 type: string
 *                 example: "30-45 mins"
 *     responses:
 *       200:
 *         description: Restaurant information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RestaurantInfo'
 *       403:
 *         description: You can only update your own restaurant
 *       404:
 *         description: Restaurant not found
 *     security:
 *       - cookieAuth: []
 */
router.patch("/restaurant/:restaurantId/info", restaurantInfoController.updateInfo);

/**
 * @swagger
 * /restaurant/{restaurantId}/business-hours:
 *   get:
 *     summary: Get restaurant business hours
 *     tags: [Restaurant Info]
 *     description: Get business hours for all days of the week. Public endpoint.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Business hours retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BusinessHours'
 */
router.get("/restaurant/:restaurantId/business-hours", restaurantInfoController.getBusinessHours);

/**
 * @swagger
 * /restaurant/{restaurantId}/business-hours:
 *   post:
 *     summary: Create/Update business hours for all days
 *     tags: [Restaurant Info]
 *     description: Create or update business hours for all days of the week. Only restaurant owner can update.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/BusinessHoursInput'
 *           example:
 *             - dayOfWeek: MONDAY
 *               openTime: "09:00"
 *               closeTime: "22:00"
 *               isClosed: false
 *             - dayOfWeek: TUESDAY
 *               openTime: "09:00"
 *               closeTime: "22:00"
 *               isClosed: false
 *     responses:
 *       201:
 *         description: Business hours created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BusinessHours'
 *       403:
 *         description: You can only update your own restaurant
 *     security:
 *       - cookieAuth: []
 */
router.post("/restaurant/:restaurantId/business-hours", restaurantInfoController.createBusinessHours);

/**
 * @swagger
 * /restaurant/{restaurantId}/business-hours/{dayOfWeek}:
 *   patch:
 *     summary: Update business hours for a specific day
 *     tags: [Restaurant Info]
 *     description: Update business hours for a specific day of the week. Only restaurant owner can update.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dayOfWeek
 *         required: true
 *         schema:
 *           type: string
 *           enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openTime:
 *                 type: string
 *                 example: "09:00"
 *               closeTime:
 *                 type: string
 *                 example: "23:00"
 *               isClosed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Business hours updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BusinessHours'
 *       403:
 *         description: You can only update your own restaurant
 *       404:
 *         description: Business hours not found
 *     security:
 *       - cookieAuth: []
 */
router.patch("/restaurant/:restaurantId/business-hours/:dayOfWeek", restaurantInfoController.updateBusinessHoursForDay);

/**
 * @swagger
 * /restaurant/{restaurantId}/business-hours/{dayOfWeek}:
 *   delete:
 *     summary: Delete business hours for a specific day
 *     tags: [Restaurant Info]
 *     description: Delete business hours for a specific day. Only restaurant owner can delete.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dayOfWeek
 *         required: true
 *         schema:
 *           type: string
 *           enum: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]
 *     responses:
 *       200:
 *         description: Business hours deleted successfully
 *       403:
 *         description: You can only delete your own restaurant data
 *       404:
 *         description: Business hours not found
 *     security:
 *       - cookieAuth: []
 */
router.delete("/restaurant/:restaurantId/business-hours/:dayOfWeek", restaurantInfoController.deleteBusinessHoursForDay);

/**
 * @swagger
 * /restaurant/{restaurantId}/business-hours:
 *   delete:
 *     summary: Delete all business hours
 *     tags: [Restaurant Info]
 *     description: Delete all business hours for a restaurant. Only restaurant owner can delete.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All business hours deleted successfully
 *       403:
 *         description: You can only delete your own restaurant data
 *     security:
 *       - cookieAuth: []
 */
router.delete("/restaurant/:restaurantId/business-hours", restaurantInfoController.deleteAllBusinessHours);

export default router;
