import { Router } from "express";
import { analyticsController } from "./analytics.controller";
import { requireAuth, requireAdminRole, requireRestaurantRole, requireRole } from "../../middlewares/role.middleware";

const router = Router();

/**
 * @swagger
 * /analytics/overall:
 *   get:
 *     summary: Get overall statistics
 *     tags: [Analytics]
 *     description: |
 *       Get overall platform statistics including total customers, total restaurants,
 *       total orders, and total revenue with breakdowns by status.
 *     responses:
 *       200:
 *         description: Overall statistics retrieved successfully
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
 *                     totalCustomers:
 *                       type: integer
 *                       description: Total number of customers (users with role USER)
 *                     totalRestaurants:
 *                       type: integer
 *                       description: Total number of restaurants
 *                     totalOrders:
 *                       type: integer
 *                       description: Total number of orders
 *                     totalRevenue:
 *                       type: number
 *                       description: Total revenue across all orders
 *                     revenueByStatus:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                       description: Revenue breakdown by order status
 *                     ordersByStatus:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                       description: Order count breakdown by status
 */
// Admin-only analytics
router.get("/analytics/overall", requireAuth, requireAdminRole, analyticsController.getOverallStatistics);

/**
 * @swagger
 * /analytics/mall/{mallId}:
 *   get:
 *     summary: Get mall analytics with time period filtering and trends
 *     tags: [Analytics]
 *     description: |
 *       Get detailed analytics for a specific mall including total revenue, total restaurants,
 *       total orders with time period filtering (today, week, month, year, all) and trend calculations.
 *     parameters:
 *       - in: path
 *         name: mallId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mall ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *           default: all
 *         description: Time period for analytics
 *         example: "month"
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Custom start date (ISO 8601 format)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Custom end date (ISO 8601 format)
 *         example: "2024-01-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Mall analytics retrieved successfully
 *       404:
 *         description: Mall not found
 */
router.get("/analytics/mall/:mallId", requireAuth, requireAdminRole, analyticsController.getMallAnalytics);

/**
 * @swagger
 * /analytics/restaurant/{restaurantId}/sales-summary:
 *   get:
 *     summary: Get restaurant sales summary with time period filtering and trends
 *     tags: [Analytics]
 *     description: |
 *       Get detailed sales summary for a specific restaurant including revenue, orders,
 *       discounts, taxes, and delivery fees with time period filtering (today, week, month, year, all) and trend calculations.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (same as user ID for restaurant)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *           default: all
 *         description: Time period for analytics
 *         example: "month"
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Custom start date (ISO 8601 format)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Custom end date (ISO 8601 format)
 *         example: "2024-01-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Restaurant sales summary retrieved successfully
 *       404:
 *         description: Restaurant not found
 */
// Restaurant analytics - restaurants can view their own, admins can view any
router.get("/analytics/restaurant/:restaurantId/sales-summary", requireAuth, requireRole("ADMIN", "RESTAURANT"), analyticsController.getRestaurantSalesSummary);

/**
 * @swagger
 * /analytics/promo-code/{promoCodeId}/details:
 *   get:
 *     summary: Get promoCode details and statistics
 *     tags: [Analytics]
 *     description: |
 *       Get detailed statistics for a promoCode including total users who used it,
 *       total orders, total discount given, and total order value.
 *     parameters:
 *       - in: path
 *         name: promoCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: PromoCode ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: PromoCode details retrieved successfully
 *       404:
 *         description: PromoCode not found
 */
router.get("/analytics/promo-code/:promoCodeId/details", requireAuth, requireAdminRole, analyticsController.getPromoCodeDetails);

/**
 * @swagger
 * /analytics/promo-code/{promoCodeId}/usage-over-time:
 *   get:
 *     summary: Get promoCode usage over time
 *     tags: [Analytics]
 *     description: |
 *       Get promoCode usage statistics over time (week, month, or year) showing
 *       number of orders and total discount per day/month.
 *     parameters:
 *       - in: path
 *         name: promoCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: PromoCode ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *         description: Time period for usage analysis
 *         example: "month"
 *     responses:
 *       200:
 *         description: PromoCode usage over time retrieved successfully
 *       404:
 *         description: PromoCode not found
 */
router.get("/analytics/promo-code/:promoCodeId/usage-over-time", requireAuth, requireAdminRole, analyticsController.getPromoCodeUsageOverTime);

/**
 * @swagger
 * /analytics/promo-code/{promoCodeId}/discount-impact:
 *   get:
 *     summary: Get discount impact by order value ranges
 *     tags: [Analytics]
 *     description: |
 *       Get discount impact analysis showing orders and total discount grouped by order value ranges
 *       (0-5k, 5k-10k, 10k-20k, 20k+). Useful for visualizing discount effectiveness across different order sizes.
 *     parameters:
 *       - in: path
 *         name: promoCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: PromoCode ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Discount impact retrieved successfully
 *       404:
 *         description: PromoCode not found
 */
router.get("/analytics/promo-code/:promoCodeId/discount-impact", requireAuth, requireAdminRole, analyticsController.getPromoCodeDiscountImpact);

/**
 * @swagger
 * /analytics/promo-code/{promoCodeId}/orders:
 *   get:
 *     summary: Get orders using promoCode with pagination
 *     tags: [Analytics]
 *     description: |
 *       Get paginated list of orders that used a specific promoCode, sorted by latest first.
 *       Shows customer name, date, time, total amount, discount given, and discounted amount.
 *     parameters:
 *       - in: path
 *         name: promoCodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: PromoCode ID
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
 *         description: PromoCode orders retrieved successfully
 *       404:
 *         description: PromoCode not found
 */
router.get("/analytics/promo-code/:promoCodeId/orders", requireAuth, requireAdminRole, analyticsController.getPromoCodeOrders);

/**
 * @swagger
 * /restaurants/all:
 *   get:
 *     summary: Get all restaurants system-wide with pagination
 *     tags: [Restaurants]
 *     description: |
 *       Get all restaurants in the system with pagination, optional filtering by mall or category.
 *       Returns restaurant details including owner info, mall info, and statistics.
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
 */
router.get("/analytics/restaurants/all", requireAuth, requireAdminRole, analyticsController.getAllRestaurantsSystemWide);

export default router;
