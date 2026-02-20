import {Router} from "express";
import betterAuthRoutes from "../modules/auth/betterauth.routes";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import countryRoutes from "../modules/location/country/country.routes";
import cityRoutes from "../modules/location/city/city.routes";
import mallRoutes from "../modules/location/malls/mall.routes";
import cuisineRoutes from "../modules/cuisine/cuisine.routes";
import restaurantRoutes from "../modules/restaurant/restaurant.routes";
import restaurantInfoRoutes from "../modules/restaurant/restaurant-info/restaurant-info.routes";
import exploreRoutes from "../modules/explore/explore.routes";
import galleryRoutes from "../modules/gallery/gallery.routes";
import searchRoutes from "../modules/search/search.routes";
import menuRoutes from "../modules/menu/menu.routes";
import menuSearchRoutes from "../modules/menu-search/menu-search.routes";
import cartRoutes from "../modules/cart/cart.routes";
import favouriteCartRoutes from "../modules/favourite-cart/favourite-cart.routes";
import productDetailRoutes from "../modules/product-detail/product-detail.routes";
import checkoutRoutes from "../modules/checkout/checkout.routes";
import deliveryAddressRoutes from "../modules/delivery-address/delivery-address.routes";
import trackOrderRoutes from "../modules/track-order/track-order.routes";
import ordersRoutes from "../modules/orders/orders.routes";
import promoCodeRoutes from "../modules/promo-code/promo-code.routes";
import adminRestaurantRoutes from "../modules/admin/block_activate-restaurant/restaurant.routes";
import adminUserRoutes from "../modules/admin/block_activate-users/user.routes";
import adminSearchRoutes from "../modules/admin/search/search.routes";
import adminPromoCodeRoutes from "../modules/admin/promo-code/promo-code.routes";
import paymentMethodRoutes from "../modules/payments/payment-method/paymentMethod.routes";
import analyticsRoutes from "../modules/analytics/analytics.routes";
import orderPaymentRoutes from "../modules/payments/order-payment/orderpayment.routes";
import orderRefundRoutes from "../modules/payments/order-refund/orderrefund.routes";
import promotionRoutes from "../modules/restaurant/promotion/promotion.routes";
import subscriptionRoutes from "../modules/restaurant/subscription/subscription.routes";
import subscriptionPlanRoutes from "../modules/restaurant/subscription/subscriptionplan-admin/subscriptionplan.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import { requireAuth } from "../middlewares/role.middleware";

const router = Router();

// Better Auth built-in routes (optional - use if you want Better Auth's default endpoints)
// These routes are excluded from requireAuth (login, signup, forgot password, etc.)
router.use("/auth/better-auth", betterAuthRoutes);

// Custom auth routes
// These routes are excluded from requireAuth (login, signup, forgot password, etc.)
router.use("/auth", authRoutes);

// Apply requireAuth to all routes after auth routes
// This ensures all routes except auth routes require authentication
router.use((req, res, next) => {
  // Skip authentication for auth routes (login, signup, forgot password)
  // Check both path and originalUrl to handle different mounting scenarios
  const path = req.path || "";
  const originalUrl = req.originalUrl || "";
  
  // Exclude auth routes that don't require authentication
  const isAuthRoute = 
    path.startsWith("/auth/register") || 
    path.startsWith("/auth/login") || 
    path.startsWith("/auth/restaurant/signup") ||
    path.startsWith("/auth/better-auth") ||
    originalUrl.includes("/auth/register") ||
    originalUrl.includes("/auth/login") ||
    originalUrl.includes("/auth/restaurant/signup") ||
    originalUrl.includes("/auth/better-auth");
  
  if (isAuthRoute) {
    return next();
  }
  
  // Apply requireAuth to all other routes
  return requireAuth(req, res, next);
});

// User routes
router.use("/users", userRoutes);

// Country routes
router.use("/countries", countryRoutes);

// City routes
router.use("/cities", cityRoutes);

// Mall routes
router.use("/malls", mallRoutes);

// Cuisine routes
router.use("/", cuisineRoutes);

// Restaurant routes
router.use("/", restaurantRoutes);

// Admin routes (restaurants, users, etc.)
router.use("/admin/restaurants", adminRestaurantRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/search", adminSearchRoutes);
router.use("/admin/promo-codes", adminPromoCodeRoutes);

// Restaurant Info routes (personal info and business hours)
router.use("/", restaurantInfoRoutes);

// Promotion routes
router.use("/", promotionRoutes);

// Mount explore routes under `/explore` to separate public Explore APIs
router.use("/explore", exploreRoutes);

// Gallery routes (separate file)
router.use("/", galleryRoutes);

// Search routes
router.use("/", searchRoutes);

// Menu routes
router.use("/", menuRoutes);

// Menu Search routes
router.use("/", menuSearchRoutes);

// Restaurant admin / owner routes
router.use("/", menuRoutes);

// Product Detail routes (before cart)
router.use("/product-detail", productDetailRoutes);

// Cart routes
router.use("/cart", cartRoutes);

// Checkout routes
router.use("/checkout", checkoutRoutes);
// Promo Code routes
router.use("/promo-codes", promoCodeRoutes);
// Delivery Address routes
router.use("/delivery-addresses", deliveryAddressRoutes);

// Track Order routes
router.use("/track-order", trackOrderRoutes);

// Orders routes (active, past, cancel, reorder)
router.use("/orders", ordersRoutes);

// Analytics routes
router.use("/", analyticsRoutes);

// Payment Method routes
router.use("/", paymentMethodRoutes);

// Favourite Cart routes (last)
router.use("/favourite-carts", favouriteCartRoutes);

// Order Payment routes
router.use("/payments", orderPaymentRoutes);

// Order Refund routes
router.use("/payments", orderRefundRoutes);

// Restaurant Subscription routes
router.use("/subscriptions", subscriptionRoutes);

// Subscription Plan Admin routes
router.use("/subscription-plans", subscriptionPlanRoutes);

// Notification routes
router.use("/notifications", notificationRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mall Delivery Backend API is running
 */
// Health check endpoint - requires authentication
router.get("/", requireAuth, (req, res) => {
    res.json({message: "Mall Delivery Backend API is running"});
});




export default router;
