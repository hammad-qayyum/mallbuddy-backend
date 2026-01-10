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
  const isProduction = process.env.NODE_ENV === "production";
  
  // For CORS with credentials, we need sameSite: "none" with secure: true
  // This works even in development on localhost (modern browsers support it)
  // Set USE_SAME_ORIGIN_COOKIES=true to use "lax" for same-origin only (no CORS)
  const useSameOriginOnly = process.env.USE_SAME_ORIGIN_COOKIES === "true";
  
  if (useSameOriginOnly) {
    // Same-origin only (no cross-origin support)
    return {
      httpOnly: true,
      secure: isProduction, // Only in production
      sameSite: "lax",
      path: "/",
    };
  }
  
  // Cross-origin support (default for CORS)
  // secure: true is required when sameSite: "none"
  // Modern browsers allow this even on localhost
  return {
    httpOnly: true, // Prevent XSS attacks
    secure: true, // Required when sameSite is "none" (works on localhost too)
    sameSite: "none", // Required for cross-origin requests with CORS
    path: "/", // Available to all paths
    // maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (optional - session cookies by default)
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
