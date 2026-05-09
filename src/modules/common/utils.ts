import { Request } from "express";

/**
 * I11 — Clamp a client-supplied `limit` query param to a sane maximum.
 * Without this, `?limit=1000000` dumps the table.
 *
 *   const limit = clampLimit(req.query.limit);          // default 20, max 100
 *   const limit = clampLimit(req.query.limit, 50, 200); // default 50, max 200
 */
export function clampLimit(raw: unknown, defaultLimit = 20, maxLimit = 100): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return defaultLimit;
  return Math.min(Math.floor(n), maxLimit);
}

/**
 * Clamp a client-supplied `offset`. Negative or non-numeric → 0.
 */
export function clampOffset(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Returns the authenticated user id from the request, or undefined.
 * Always derived from the verified session (req.auth) — never from
 * req.body / req.query / req.params, which are attacker-controlled.
 *
 * Use this in every controller that scopes data by user — passing a
 * client-supplied userId is an IDOR.
 */
export function getAuthUserId(req: Request): string | undefined {
  return (req as any).auth?.user?.id;
}

/**
 * Returns the authenticated user's role (uppercase) or undefined.
 */
export function getAuthRole(req: Request): string | undefined {
  const role = (req as any).auth?.user?.role;
  return role ? String(role).toUpperCase() : undefined;
}

/**
 * Converts Express request headers to Fetch API Headers object
 * This is needed because Better Auth uses the Fetch API standard
 */
export function expressHeadersToFetch(req: Request): Headers {
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  });
  return headers;
}

/**
 * Builds headers suitable for Better Auth API calls.
 * - Starts from the incoming Express headers (including cookies)
 * - If an Authorization header is present, keeps it
 * - Otherwise, if we have the Better Auth session cookie, turns it into a Bearer token
 */
export function buildBetterAuthHeaders(req: Request): Headers {
  const headers = expressHeadersToFetch(req);

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    headers.set("Authorization", authHeader);
  } else {
    const cookieToken =
      (req as any).cookies?.["better-auth.session_token"] ??
      (req as any).cookies?.betterAuthSessionToken;

    if (cookieToken && !headers.get("Authorization")) {
      headers.set("Authorization", `Bearer ${cookieToken}`);
    }
  }

  return headers;
}

const PHONE_ALIAS_DOMAIN = "phone.auth.local";

/**
 * Normalizes a user provided phone number:
 * - If it starts with '+', preserves the plus and removes all non-digits after it (E.164 format)
 * - Otherwise, removes all non-digit characters
 */
export const normalizePhoneNumber = (phoneNumber: string) => {
  if (phoneNumber.startsWith('+')) {
    // Keep the plus, strip non-digits from the rest
    return '+' + phoneNumber.slice(1).replace(/[^\d]/g, '');
  }
  // Remove all non-digits
  return phoneNumber.replace(/[^\d]/g, '');
};

/**
 * Converts a normalized phone number into an alias email we
 * can send to Better Auth while still letting users log in
 * with their phone number.
 */
export const phoneAsAliasEmail = (phoneNumber: string) =>
  `phone+${normalizePhoneNumber(phoneNumber)}@${PHONE_ALIAS_DOMAIN}`;

