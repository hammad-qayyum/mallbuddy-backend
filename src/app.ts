import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import {swaggerSpec} from "./config/swagger";
import router from "./routes";
import { attachAuth } from "./middlewares/attach-auth.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { csrfHeaderGuard } from "./middlewares/csrf.middleware";

const app = express();

// The app runs behind one reverse-proxy hop (TLS terminates in front of
// Node on the VPS). trust proxy = 1 makes req.ip the real client IP so the
// express-rate-limit throttles apply per client, not per proxy.
app.set("trust proxy", 1);

// GAP-008 — standard security headers on every response (this origin also
// serves user-uploaded files at /uploads and Swagger at /api-docs):
// X-Content-Type-Options: nosniff, X-Frame-Options, HSTS, Referrer-Policy…
// CSP is disabled (it breaks Swagger UI's inline scripts; the API serves
// JSON, not pages) and cross-origin-resource-policy is relaxed so the
// mobile apps and the Vercel-proxied admin web can still load /uploads.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // No-origin requests (curl, server-to-server like Amwal webhook) are allowed.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);




// Stripe webhooks must be before attachAuth (uses raw body)


// I13 — explicit body-size limit. Default is 100KB; we tighten to 100KB
// here to keep it deliberate. Multer routes have their own per-file limit.
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// N4 — CSRF defense via custom-header requirement on state-changing routes.
// Mounted before route handlers so unauthenticated cross-origin POSTs are
// rejected before they hit anything sensitive.
app.use(csrfHeaderGuard);

// Apply general rate limiting to all routes
// app.use("/api", apiLimiter);

// Attach auth middleware early so it's available for all routes
app.use(attachAuth);

// Restaurant connect routes (requires auth)

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Mall Food Delivery API Documentation",
  swaggerOptions: {
    withCredentials: true,
  },
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
// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );


// Global error handler — must be last so it catches anything else.
app.use(errorHandler);

export default app;