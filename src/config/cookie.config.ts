/**
 * Centralized cookie configuration for session management
 * Ensures consistent cookie settings across the application
 */

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge?: number;
  domain?: string;
}

/**
 * Get cookie options based on environment
 * For CORS to work with credentials:
 * - sameSite: "none" requires secure: true (browser requirement)
 * - Modern browsers allow secure: true even on localhost for development
 * - In production, always use "none" with secure: true for cross-origin support
 */
export function getCookieOptions(): CookieOptions {
  // SECURE_COOKIES=true forces `secure: true` (required in production over HTTPS).
  // Falls back to NODE_ENV so prod-deployed instances are safe by default.
  const secure =
    process.env.SECURE_COOKIES === "true" || process.env.NODE_ENV === "production";

  // Cross-site (frontend on a different origin than the API) requires
  // `sameSite: "none"`, which in turn requires `secure: true`.
  const sameSite: "none" | "lax" = secure ? "none" : "lax";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };
}

/**
 * Get cookie options for clearing cookies (logout)
 */
export function getClearCookieOptions(): CookieOptions {
  return {
    ...getCookieOptions(),
    // When clearing, we need to match the same options used when setting
    maxAge: 0, // Expire immediately
  };
}
