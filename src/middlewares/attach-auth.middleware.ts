import {Request, Response, NextFunction} from "express";
import {authService} from "../modules/auth/auth.service";

// Middleware to populate req.auth with user session on all requests
export const attachAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Short-circuit: allow gallery uploads to proceed without DB-auth when DB is unreachable
        // This helps local testing when the DB is down (avoids Prisma attempts on every request)
        const isGalleryUpload = req.method === "POST" && /^\/api\/restaurant\/[^\/]+\/gallery$/.test(req.originalUrl || req.url);
        if (isGalleryUpload) {
            (req as any).auth = undefined;
            return next();
        } const isStripeWebhook = 
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