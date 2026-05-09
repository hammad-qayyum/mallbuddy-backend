import { Request, Response, NextFunction } from "express";
import { logger } from "../libs/logger";

/**
 * I4 — Centralized error handler. Catches anything thrown / `next(err)`'d in
 * an Express handler that wasn't explicitly turned into a JSON response.
 *
 * - Logs full error server-side (with stack) so ops can debug.
 * - Returns a generic message to the client to avoid leaking implementation
 *   details (Prisma error codes, table names, file paths, stack traces).
 * - Recognizes a few well-known HTTP-shaped errors so business-rule messages
 *   set explicitly via `(err as any).status = 4xx` still flow through.
 * - Recognizes the body-parser "request entity too large" (413) and the
 *   express-rate-limit / cors errors so they get a proper status code.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // If the route already wrote the response, fall through to the default
  // Express handler (which closes the connection).
  if (res.headersSent) {
    return _next(err);
  }

  // Body-parser: payload too large (I13)
  if (err?.type === "entity.too.large" || err?.statusCode === 413) {
    return res.status(413).json({ success: false, error: "Request body too large" });
  }

  // CORS rejection from the cors() origin callback
  if (typeof err?.message === "string" && err.message.startsWith("CORS:")) {
    return res.status(403).json({ success: false, error: "CORS: origin not allowed" });
  }

  // Explicit status set by the caller (e.g. `(err as any).status = 404`)
  const status = Number(err?.status ?? err?.statusCode);
  const safeStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;

  // Log everything server-side. Never log secrets / passwords / tokens.
  logger.error("unhandled error", {
    method: req.method,
    url: req.originalUrl,
    status: safeStatus,
    message: err?.message,
    name: err?.name,
    code: err?.code,
    stack: err?.stack,
  });

  // Client-facing message: only echo something we set on purpose.
  // For 4xx, the caller-provided message is generally OK (it was deliberate).
  // For 5xx, return a generic string — never leak err.message.
  const clientMessage =
    safeStatus < 500 && typeof err?.expose === "boolean" && err.expose
      ? err.message
      : safeStatus < 500 && typeof err?.message === "string" && err.message.length < 200 && !err?.message?.includes("at ")
        ? err.message
        : "Internal server error";

  res.status(safeStatus).json({ success: false, error: clientMessage });
}
