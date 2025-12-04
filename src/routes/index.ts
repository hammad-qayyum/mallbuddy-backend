import {Router} from "express";
import betterAuthRoutes from "../modules/auth/betterauth.routes";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import countryRoutes from "../modules/location/country/country.routes";
import cityRoutes from "../modules/location/city/city.routes";
import mallRoutes from "../modules/location/malls/mall.routes";
import cuisineRoutes from "../modules/cuisine/cuisine.routes";
import restaurantRoutes from "../modules/restaurant/restaurant.routes";
import menuRoutes from "../modules/menu/menu.routes";

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

// Menu routes
router.use("/", menuRoutes);

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

export default router;
