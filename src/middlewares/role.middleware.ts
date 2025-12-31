import { Request, Response, NextFunction } from "express";

type AppRole = "USER" | "ADMIN" | "RESTAURANT";

function getAuthUser(req: Request): { id: string; role?: AppRole } | null {
  const auth = (req as any).auth;
  if (!auth || !auth.user) {
    return null;
  }
  
  const user = auth.user;
  // Ensure role is properly typed and uppercase (in case it comes as lowercase from DB)
  let role: AppRole | undefined = undefined;
  
  if (user.role) {
    // Handle both string and enum values, ensure uppercase
    const roleStr = String(user.role).toUpperCase();
    if (roleStr === 'USER' || roleStr === 'ADMIN' || roleStr === 'RESTAURANT') {
      role = roleStr as AppRole;
    }
  }

  // Ensure the returned object does not include an explicit "role" key if undefined
  const result: { id: string; role?: AppRole } = { id: user.id };
  if (role !== undefined) {
    result.role = role;
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
    
    // Debug logging to help diagnose role issues (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[requireRole] Debug:', { 
        userId: user.id, 
        userRole: role, 
        roleType: typeof role,
        allowedRoles,
        authUser: (req as any).auth?.user 
      });
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


