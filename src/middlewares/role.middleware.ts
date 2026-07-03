import { Request, Response, NextFunction } from "express";

type AppRole = "USER" | "ADMIN" | "RESTAURANT" | "MALL_ADMIN";

function getAuthUser(
  req: Request
): { id: string; role?: AppRole; managedMallId?: string | null } | null {
  const auth = (req as any).auth;
  if (!auth || !auth.user) {
    return null;
  }

  const user = auth.user;
  // N10 — defensive uppercasing. Prisma's `Role` enum is uppercase
  // (USER/ADMIN/RESTAURANT/MALL_ADMIN) and Postgres stores it uppercase, so
  // this *should* be a no-op. Kept as a belt-and-suspenders guard against any
  // future better-auth release that returns the role as a JS string.
  let role: AppRole | undefined = undefined;

  if (user.role) {
    const roleStr = String(user.role).toUpperCase();
    if (roleStr === 'USER' || roleStr === 'ADMIN' || roleStr === 'RESTAURANT' || roleStr === 'MALL_ADMIN') {
      role = roleStr as AppRole;
    }
  }

  // Ensure the returned object does not include an explicit "role" key if undefined
  const result: { id: string; role?: AppRole; managedMallId?: string | null } = { id: user.id };
  if (role !== undefined) {
    result.role = role;
  }
  if (user.managedMallId !== undefined) {
    result.managedMallId = user.managedMallId;
  }
  return result;
}

/**
 * Generic role-checking middleware factory.
 * Accepts one or more allowed roles and ensures the authenticated user has one of them.
 * Admins have elevated privileges and can access USER and RESTAURANT routes.
 */
export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthUser(req);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    const role = user.role;
    
    // N13 — log only what's needed to diagnose role issues. Don't log the
    // full auth.user object (leaks email/phone to anyone with log access).
    if (process.env.NODE_ENV !== 'production') {
      console.log('[requireRole]', { userRole: role, allowedRoles });
    }
    
    // Admins have elevated privileges - they can access USER and RESTAURANT routes
    if (role === "ADMIN") {
      // Admin can access any route (USER, RESTAURANT, or ADMIN)
      return next();
    }
    
    if (!role || !allowedRoles.includes(role)) {
      const errorMessage = `Forbidden: insufficient role. User role: ${role || 'undefined'}, Required: ${allowedRoles.join(', ')}`;
      if (process.env.NODE_ENV !== 'production') {
        console.error('[requireRole] Access denied:', errorMessage);
      }
      return res.status(403).json({ 
        success: false,
        message: errorMessage
      });
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

/**
 * Require either ADMIN or RESTAURANT role
 */
export const requireAdminOrRestaurant = requireRole("ADMIN", "RESTAURANT");

/**
 * Require an admin-panel role: global super admin (ADMIN) or mall-scoped
 * admin (MALL_ADMIN). MALL_ADMIN gets NO blanket bypass in requireRole — it
 * must be explicitly listed, and every handler behind this middleware is
 * responsible for scoping its data with getMallScope() (GAP-018).
 */
export const requireAnyAdminRole = requireRole("ADMIN", "MALL_ADMIN");

/**
 * Mall scope for admin-panel queries (GAP-018).
 *
 * Returns `null` for the global super admin (ADMIN — unscoped) and the
 * managed mall id for MALL_ADMIN. Only call behind requireAnyAdminRole.
 * Backend services are the source of truth for tenancy: they must force
 * (lists/creates) or verify (single-object access) the mall id whenever a
 * non-null scope is returned.
 */
export function getMallScope(req: Request): string | null {
  const user = getAuthUser(req);
  if (user?.role === "MALL_ADMIN") {
    if (!user.managedMallId) {
      // Misprovisioned account — fail closed rather than falling through
      // to unscoped (super admin) behavior.
      throw new Error("MALL_ADMIN account has no managed mall assigned");
    }
    return user.managedMallId;
  }
  return null;
}

/**
 * Require either RESTAURANT or USER role
 */
export const requireRestaurantOrUserRole = requireRole("RESTAURANT", "USER");

/**
 * Require authentication (any logged-in user)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      message: "Unauthorized" 
    });
  }
  
  next();
}

/**
 * Middleware to ensure restaurant owns the resource
 * Use this for routes like /restaurant/:restaurantId/...
 */
export function requireRestaurantOwnership(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  const restaurantId = req.params.restaurantId || req.body.restaurantId;
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      message: "Unauthorized" 
    });
  }
  
  // Admins can access any restaurant
  if (user.role === "ADMIN") {
    return next();
  }
  
  // Restaurant users can only access their own restaurant
  if (user.role === "RESTAURANT" && user.id === restaurantId) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false,
    message: "Forbidden: You can only access your own restaurant" 
  });
}

/**
 * Middleware to ensure user owns the resource
 * Use this for routes like /users/:userId/...
 */
export function requireUserOwnership(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  const userId = req.params.userId || req.body.userId;
  
  if (!user) {
    return res.status(401).json({ 
      success: false,
      message: "Unauthorized" 
    });
  }
  
  // Admins can access any user
  if (user.role === "ADMIN") {
    return next();
  }
  
  // Users can only access their own data
  if (user.id === userId) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false,
    message: "Forbidden: You can only access your own data" 
  });
}


