import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import {swaggerSpec} from "./config/swagger";
import router from "./routes";
import {attachAuth} from "./middlewares/attach-auth.middleware";

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

// Add Better Auth Express middleware to populate req.auth on all requests
app.use(attachAuth);

app.use("/api", router);

export default app;
