import {Router} from "express";
import betterAuthRoutes from "../modules/auth/betterauth.routes";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import countryRoutes from "../modules/location/country/country.routes";
import cityRoutes from "../modules/location/city/city.routes";
import mallRoutes from "../modules/location/malls/mall.routes";
import cuisineRoutes from "../modules/cuisine/cuisine.routes";
import restaurantRoutes from "../modules/restaurant/restaurant.routes";
import restaurantInfoRoutes from "../modules/restaurant-info/restaurant-info.routes";
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
import paymentMethodRoutes from "../modules/payments/payment-method/paymentMethod.routes";

const router = Router();

// Better Auth built-in routes (optional - use if you want Better Auth's default endpoints)
router.use("/auth/better-auth", betterAuthRoutes);

// Custom auth routes
router.use("/auth", authRoutes);

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

// Restaurant Info routes (personal info and business hours)
router.use("/", restaurantInfoRoutes);

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
router.use("/", promoCodeRoutes);
// Delivery Address routes
router.use("/delivery-addresses", deliveryAddressRoutes);

// Track Order routes
router.use("/track-order", trackOrderRoutes);

// Orders routes (active, past, cancel, reorder)
router.use("/orders", ordersRoutes);

// Payment Method routes
router.use("/", paymentMethodRoutes);

// Favourite Cart routes (last)
router.use("/favourite-carts", favouriteCartRoutes);

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
router.get("/", (req, res) => {
    res.json({message: "Mall Delivery Backend API is running"});
});

// Debug helper: list registered routes under this router
router.get('/restaurant/debug/routes', (req, res) => {
    try {
        // iterate router stack and collect routes
        // @ts-ignore
        const stack = (router as any).stack || (router as any)._router?.stack || [];
        const routes: string[] = [];

        // express Router stores layers differently; inspect both possibilities
        stack.forEach((layer: any) => {
            if (layer.route && layer.route.path) {
                const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
                routes.push(`${methods} ${layer.route.path}`);
            } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
                layer.handle.stack.forEach((r: any) => {
                    if (r.route && r.route.path) {
                        const methods = Object.keys(r.route.methods || {}).map((m: any) => m.toUpperCase()).join(',');
                        routes.push(`${methods} ${r.route.path}`);
                    }
                });
            }
        });

        res.json({ success: true, routes });
    } catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});



export default router;
