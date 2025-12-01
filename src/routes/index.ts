import {Router} from "express";
import betterAuthRoutes from "../modules/auth/betterauth.routes";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";

const router = Router();

// Better Auth built-in routes (optional - use if you want Better Auth's default endpoints)
router.use("/auth/better-auth", betterAuthRoutes);

// Custom auth routes
router.use("/auth", authRoutes);

// User routes
router.use("/users", userRoutes);

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
