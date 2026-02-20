import { Request, Response, NextFunction } from "express";

// This middleware assumes you already mounted Better Auth's express middleware
// so that req.auth contains { user, session, ... }.

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth; // Access the auth object added by Better Auth

  if (!auth || !auth.user) {
    // If there is no auth or no user, the request is unauthorized
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  // If authenticated, just go to the next handler
  next();
}
