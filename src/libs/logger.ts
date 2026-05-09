import winston from "winston";

/**
 * N6 — Structured logger. All new code should use this instead of
 * console.log / console.error. JSON output in production (so log
 * collectors can parse it); pretty/colorized in development.
 *
 * Usage:
 *   import { logger } from "../libs/logger";
 *   logger.info("payment activated", { subscriptionId, restaurantId });
 *   logger.warn("rate-limit hit", { ip: req.ip });
 *   logger.error("amwal upstream", { error: err.message });
 *
 * Levels (most → least severe): error, warn, info, http, debug.
 * Configure default via LOG_LEVEL env (default: info).
 */
const isProd = process.env.NODE_ENV === "production";

const baseFormats = [
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: isProd
    ? winston.format.combine(...baseFormats, winston.format.json())
    : winston.format.combine(
        ...baseFormats,
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
          return `${timestamp} ${level} ${message}${metaStr}`;
        })
      ),
  transports: [new winston.transports.Console()],
});
