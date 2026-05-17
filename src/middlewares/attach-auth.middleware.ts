import {Request, Response, NextFunction} from "express";
import {authService} from "../modules/auth/auth.service";

// Middleware to populate req.auth with user session on all requests
export const attachAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // (Removed) gallery-upload auth-skip short-circuit — it was a
        // local-dev workaround for DB-down testing, but in production it
        // sets req.auth=undefined which the route's requireAuth turns
        // into a 401, breaking real uploads.

        const isStripeWebhook =
        req.originalUrl === "/api/payments/stripe-webhook" || 
        req.originalUrl === "/api/payments/stripe-webhooks/stripe-webhook" ||
        req.originalUrl === "/api/payments/stripe-webhooks/stripe-account-webhook" ||
        req.originalUrl?.startsWith("/api/payments/stripe-webhooks/");
      
      if (isStripeWebhook) {
        return next();
      }

        const session = await authService.getSession(req);

        // Attach session (or null) to request object
        (req as any).auth = session;
    } catch (err) {
        // If no session found or an error occurs, req.auth will be undefined
        console.warn('[attachAuth] failed to attach session, continuing without auth:', (err as any)?.message || err);
        (req as any).auth = undefined;
    }

    // Always continue to next middleware
    next();
};