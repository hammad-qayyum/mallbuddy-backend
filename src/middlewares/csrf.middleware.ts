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
 * Excluded (CSRF doesn't apply or is over-protective):
 *  - safe methods (GET/HEAD/OPTIONS)
 *  - the Amwal cloud-notification webhook (server-to-server, hash-verified)
 *  - file-upload routes that use multipart/form-data (which itself requires
 *    a non-simple Content-Type and can't be triggered from a basic <form>)
 *  - pre-auth routes (login / register / signup OTP / password reset). CSRF
 *    protects authenticated state-changing actions; before login there's
 *    no session for an attacker to forge against. These routes have their
 *    own rate limiters (see C3 + C5).
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Pre-auth public routes that don't need CSRF protection.
const AUTH_ROUTE_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/restaurant/signup",
  "/auth/user/signup",
  "/auth/password/reset",
  "/auth/better-auth",
];

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

  // Pre-auth routes — login can't be CSRF'd in any meaningful way (the
  // attacker would just be logging in as themselves on the victim's browser,
  // which has no value). Brute force is handled by the auth rate limiters.
  const path = req.path || "";
  const url = req.originalUrl || "";
  for (const prefix of AUTH_ROUTE_PREFIXES) {
    if (path.startsWith(prefix) || url.includes(prefix)) return true;
  }

  // Requests authenticated via explicit headers are not CSRF-able: browsers
  // never attach Authorization (or a custom header) implicitly, and a
  // cross-origin page that sets one programmatically makes the request
  // non-simple, triggering a CORS preflight our allowlist rejects. The
  // header's presence itself proves this is not a forged simple request
  // (SMOKE BUG-05). Cookie-only requests remain fully guarded.
  const authHeader = (req.headers.authorization || "").toString();
  if (authHeader.toLowerCase().startsWith("bearer ")) return true;
  if (req.headers["better-auth.session_token"]) return true;

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
