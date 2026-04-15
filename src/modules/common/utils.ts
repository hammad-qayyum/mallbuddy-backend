import { Request } from "express";

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

