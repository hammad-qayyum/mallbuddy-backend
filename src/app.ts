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

// CORS configuration
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : isProduction
  ? [] // In production, require ALLOWED_ORIGINS to be set
  : [
      // Default development origins
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5000",
      "http://localhost:5001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl requests)
      if (!origin) return callback(null, true);
      
      // In development, allow all origins if ALLOWED_ORIGINS is not set
      if (!isProduction && (!process.env.ALLOWED_ORIGINS || allowedOrigins.length === 0)) {
        return callback(null, true);
      }
      
      // In production, require origin to be in allowed list
      if (isProduction && allowedOrigins.length === 0) {
        return callback(new Error("CORS: ALLOWED_ORIGINS must be set in production"));
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true, // Allow cookies and authentication headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Set-Cookie"], // Expose Set-Cookie header to client
    maxAge: 86400, // Cache preflight requests for 24 hours
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
app.use((req, res) => {
    console.warn('[404] Not Found', req.method, req.originalUrl);
    // respond with JSON when client expects JSON
    res.status(404).json({ success: false, message: 'Not Found' });
});

// Global error handler


export default app;
