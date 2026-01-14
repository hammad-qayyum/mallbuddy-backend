import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import {swaggerSpec} from "./config/swagger";
import router from "./routes";
import { attachAuth } from "./middlewares/attach-auth.middleware";
import orderPaymentRoutes from "./modules/payments/order-payment/orderpayment.routes";
import { stripeWebhookHandler } from "./modules/payments/stripe-webhooks/stripe.webhook";
import { handleStripeAccountWebhook } from "./modules/payments/stripe-webhooks/accountstatus.webhook";
import { subscriptionWebhookHandler } from "./modules/restaurant/subscription/subscriptionWebhook";
import restaurantConnectRoutes from "./modules/payments/restaurant-connect-account/restaurantconnect.routes";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);




// Stripe webhooks must be before attachAuth (uses raw body)
app.post("/api/payments/stripe-webhooks/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
// Stripe account webhook endpoint
app.post(
    "/api/payments/stripe-webhooks/stripe-account-webhook",
    express.raw({ type: "application/json" }), // required for Stripe webhook signature verification
    handleStripeAccountWebhook
  );
// Stripe subscription webhook endpoint
app.post(
    "/api/payments/stripe-webhooks/subscription-webhook",
    express.raw({ type: "application/json" }), // required for Stripe webhook signature verification
    subscriptionWebhookHandler
  );

app.use(express.json());
app.use(cookieParser());

// Apply general rate limiting to all routes
// app.use("/api", apiLimiter);

// Attach auth middleware early so it's available for all routes
app.use(attachAuth);

// Restaurant connect routes (requires auth)
app.use("/api/payments/stripe", restaurantConnectRoutes);

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Mall Food Delivery API Documentation",
}));

// Note: `attachAuth` middleware removed — authentication handled elsewhere when needed.

// Simple request logger to help debug 404s during testing
app.use((req, res, next) => {
    try {
        console.log('[req]', req.method, req.originalUrl);
    } catch (e) {}
    next();
});

app.use("/api", router);

// Log registered routes for debugging (prints path and method)
function listRoutes() {
    try {
        const routes: string[] = [];
        // @ts-ignore
        const stack = (app as any)._router.stack || [];
        stack.forEach((layer: any) => {
            if (layer.route && layer.route.path) {
                const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
                routes.push(`${methods} ${layer.route.path}`);
            } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
                layer.handle.stack.forEach((r: any) => {
                    if (r.route && r.route.path) {
                        const methods = Object.keys(r.route.methods).map((m: any) => m.toUpperCase()).join(',');
                        routes.push(`${methods} ${r.route.path}`);
                    }
                });
            }
        });
        console.log('Registered routes:', routes.slice(0, 200));
    } catch (err) {
        // ignore
    }
}

listRoutes();

// 404 handler for unmatched routes (logs the request)
// CORS configuration - allow all origins (same as last working commit)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Global error handler


export default app;