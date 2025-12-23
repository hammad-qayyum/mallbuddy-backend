import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import {swaggerSpec} from "./config/swagger";
import router from "./routes";
import { attachAuth } from "./middlewares/attach-auth.middleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Mall Food Delivery API Documentation",
}));

// Note: `attachAuth` middleware removed — authentication handled elsewhere when needed.
app.use(attachAuth);

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Unhandled Error]', err?.stack || err);
    res.status(err?.status || 500).json({ success: false, message: err?.message || 'Internal Server Error' });
});

export default app;
