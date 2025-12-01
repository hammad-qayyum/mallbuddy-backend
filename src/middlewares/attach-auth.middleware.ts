import {Request, Response, NextFunction} from "express";
import {authService} from "../modules/auth/auth.service";

// Middleware to populate req.auth with user session on all requests
export const attachAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await authService.getSession(req);

        // Attach session (or null) to request object
        (req as any).auth = session;
    } catch {
        // If no session found or an error occurs, req.auth will be undefined
        (req as any).auth = undefined;
    }

    // Always continue to next middleware
    next();
};