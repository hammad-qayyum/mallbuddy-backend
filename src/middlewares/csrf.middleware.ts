import { Request, Response, NextFunction } from "express";

/**
 * N4 — Custom-header CSRF defense.
 *
 * Now that auth cookies are `sameSite: "none"` (required for cross-origin
 * frontends), the browser's default CSRF defense is off. CORS allowlist
 * restricts which origins the *response* is exposed to, but a malicious
 * page can still cause the *request* to be sent with cookies attached.
 *
 * Defense: require a custom request header (`X-Requested-With`) on every
 * state-changing request. The browser blocks cross-origin requests with
 * non-simple headers unless the server returns a permissive CORS preflight
 * — which we don't grant to unknown origins (see app.ts CORS allowlist).
 *
 * Practical effect: the legitimate frontend sends `X-Requested-With:
 * fetch` (or `XMLHttpRequest`) and is unaffected. A malicious page
 * cross-origin POST without that header is rejected.
 *
 * Excluded:
 *  - safe methods (GET/HEAD/OPTIONS)
 *  - the Amwal cloud-notification webhook (server-to-server, hash-verified)
 *  - file-upload routes that use multipart/form-data (which itself requires
 *    a non-simple Content-Type and can't be triggered from a basic <form>)
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isExempt(req: Request): boolean {
  if (SAFE_METHODS.has(req.method)) return true;

  // Public webhook — Amwal posts here directly, no browser involved.
  if (req.path === "/payments/amwal/webhook" || req.originalUrl.includes("/payments/amwal/webhook")) {
    return true;
  }

  // Multipart uploads (file forms) trigger a CORS preflight on cross-origin
  // requests, so they're already protected by the allowlist.
  const contentType = req.headers["content-type"] || "";
  if (typeof contentType === "string" && contentType.startsWith("multipart/form-data")) {
    return true;
  }

  return false;
}

export function csrfHeaderGuard(req: Request, res: Response, next: NextFunction) {
  if (isExempt(req)) return next();

  const header = req.headers["x-requested-with"];
  if (!header) {
    return res.status(403).json({
      success: false,
      error: "Missing X-Requested-With header",
    });
  }
  next();
}
