import { Request, Response, NextFunction } from "express";

type AppRole = "USER" | "ADMIN" | "RESTAURANT";

function getAuthUser(req: Request): { id: string; role?: AppRole } | null {
  const auth = (req as any).auth;
  if (!auth || !auth.user) {
    return null;
  }
  return auth.user as { id: string; role?: AppRole };
}

/**
 * Generic role-checking middleware factory.
 * Accepts one or more allowed roles and ensures the authenticated user has one of them.
 */
export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = user.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
}

/**
 * Require a regular end user (Role.USER).
 */
export const requireUserRole = requireRole("USER");

/**
 * Require a restaurant user (Role.RESTAURANT).
 */
export const requireRestaurantRole = requireRole("RESTAURANT");

/**
 * Require an admin user (Role.ADMIN).
 */
export const requireAdminRole = requireRole("ADMIN");


