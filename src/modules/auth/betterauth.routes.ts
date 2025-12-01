import {Router} from "express";
import {betterAuthHandler} from "../../middlewares/betterauth.middleware";

const router = Router();

// Better Auth built-in routes
// Handles all Better Auth endpoints:
// - POST /api/auth/better-auth/sign-up/email
// - POST /api/auth/better-auth/sign-in/email
// - POST /api/auth/better-auth/sign-out
// - GET /api/auth/better-auth/session
// etc.

router.use(betterAuthHandler);

export default router;

