import {Router} from "express";
import rateLimit from "express-rate-limit";
import {betterAuthHandler} from "../../middlewares/betterauth.middleware";

const router = Router();

// GAP-008 — the Better Auth catch-all exposes a parallel email+password
// login (/sign-in/email) and signup (/sign-up/email) that previously had
// NO rate limiting, bypassing the throttles on the custom /auth/login and
// /auth/register routes (brute-force risk). Throttle the credential
// endpoints here; benign endpoints (get-session etc.) stay unthrottled.
const betterAuthCredentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // mirrors the custom /auth/login limiter
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

router.use(["/sign-in", "/sign-up"], betterAuthCredentialLimiter);

// Better Auth built-in routes
// Handles all Better Auth endpoints:
// - POST /api/auth/better-auth/sign-up/email
// - POST /api/auth/better-auth/sign-in/email
// - POST /api/auth/better-auth/sign-out
// - GET /api/auth/better-auth/session
// etc.

router.use(betterAuthHandler);

export default router;
