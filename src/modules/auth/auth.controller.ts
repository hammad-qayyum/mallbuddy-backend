import {Request, Response} from "express";
import {authService} from "./auth.service";
import {getCookieOptions, getClearCookieOptions} from "../../config/cookie.config";

import{
    registerSchema,
    loginSchema,
    requestUserOTPSchema,
    requestRestaurantOTPSchema,
    verifyUserOTPSchema,
    verifyRestaurantOTPSchema,
    completeUserProfileSchema,
    completeRestaurantProfileSchema,
    setPasswordSchema,
    requestPasswordResetSchema,
    verifyPasswordResetOTPSchema,
    resetPasswordSchema,
} from "./auth.schema";
import { restaurantSignupSchema } from "../restaurant/restaurant.schema";


export const authController = {

    //Register a new user
    async register(req: Request, res: Response){
        const parsed= registerSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json(parsed.error.flatten());
        }

        try{
            const result= await authService.register(req);
            // Set Better Auth session token as httpOnly cookie so subsequent requests are authenticated
            // Better Auth email+password APIs return { redirect, token, user }
            const sessionToken = (result as any)?.token;
            if (sessionToken) {
                res.cookie("better-auth.session_token", sessionToken, getCookieOptions());
            }
            return res.status(201).json(result);
        }
        catch (err:any) {
            return res.status(400).json({
                message: err.message || "Registration failed"
            });
        }
    },


    //Login user
    async login(req: Request, res: Response){
        const parsed= loginSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json(parsed.error.flatten());
        }

        try{
            const result= await authService.login(req);
            // Set Better Auth session token as httpOnly cookie so subsequent requests are authenticated
            // Better Auth email+password APIs return { redirect, token, user }
            const sessionToken = (result as any)?.token;
            if (sessionToken) {
                res.cookie("better-auth.session_token", sessionToken, getCookieOptions());
            }
            return res.json(result);
        }
        catch (err:any) {
            return res.status(401).json({
                message: err.message || "Login failed"
            });
        }
    },


    //Logout user
    async logout(req: Request, res: Response){
        try{
            const result= await authService.logout(req);
            // Clear Better Auth session cookie on logout
            res.clearCookie("better-auth.session_token", getClearCookieOptions());
            return res.json(result);
        }
        catch (err:any) {
            return res.status(400).json({
                message: err.message || "Logout failed"
            });
        }
    },


    //Restaurant signup
    async restaurantSignup(req: Request, res: Response){
        const parsed = restaurantSignupSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json(parsed.error.flatten());
        }

        try{
            const result = await authService.restaurantSignup(req);
            // Set Better Auth session token as httpOnly cookie
            const sessionToken = (result as any)?.session?.token;
            if (sessionToken) {
                res.cookie("better-auth.session_token", sessionToken, getCookieOptions());
            }
            return res.status(201).json({
                message: "Restaurant account created successfully",
                data: {
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        role: result.user.role,
                    },
                    restaurant: result.restaurant,
                },
            });
        }
        catch (err:any) {
            // Handle email already exists
            if (err.message?.includes("already exists") || err.message?.includes("unique") || err.message?.includes("duplicate") || err.message?.includes("Email already")) {
                return res.status(409).json({
                    success: false,
                    message: "Email already registered"
                });
            }
            // Handle phone number already exists
            if (err.message?.includes("Phone number") && err.message?.includes("already registered")) {
                return res.status(409).json({
                    success: false,
                    message: err.message
                });
            }
            // Handle validation errors
            if (err.message?.includes("required") || err.message?.includes("Invalid")) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "Validation error"
                });
            }
            return res.status(500).json({
                success: false,
                message: err.message || "Restaurant signup failed"
            });
        }
    },

    // Request OTP for user signup (can also be used to resend)
    async requestUserSignupOTP(req: Request, res: Response) {
        const parsed = requestUserOTPSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.requestUserSignupOTP(req);
            return res.json(result);
        } catch (err: any) {
            if (err.message?.includes("already registered")) {
                return res.status(409).json({
                    message: err.message,
                });
            }
            // Handle email/SMS sending errors
            if (err.message?.includes("Failed to send")) {
                return res.status(500).json({
                    message: err.message,
                });
            }
            return res.status(400).json({
                message: err.message || "Failed to send OTP",
            });
        }
    },

    // Resend OTP for user signup (same as request, but explicit endpoint)
    async resendUserSignupOTP(req: Request, res: Response) {
        // Same logic as requestUserSignupOTP - resending is just requesting again
        return this.requestUserSignupOTP(req, res);
    },

    // Verify OTP for user signup
    async verifyUserSignupOTP(req: Request, res: Response) {
        const parsed = verifyUserOTPSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.verifyUserSignupOTP(req);
            return res.json({
                message: "OTP verified successfully",
                verified: true,
                verificationToken: result.verificationToken,
                identifier: result.identifier,
                identifierType: result.identifierType,
            });
        } catch (err: any) {
            return res.status(400).json({
                message: err.message || "OTP verification failed",
            });
        }
    },

    // Complete user profile and create account
    async completeUserProfile(req: Request, res: Response) {
        const parsed = completeUserProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.completeUserProfile(req);
            
            const sessionToken = (result as any)?.token;
            if (sessionToken) {
                res.cookie("better-auth.session_token", sessionToken, getCookieOptions());
            }
            
            // Check if password was provided
            const needsPassword = !req.body.password;
            
            return res.status(201).json({
                message: "Account created successfully",
                user: result.user,
                ...(needsPassword && { 
                    requiresPassword: true,
                    message: "Account created successfully. Please set your password using /auth/set-password endpoint."
                }),
            });
        } catch (err: any) {
            if (err.message?.includes("already exists") || err.message?.includes("unique")) {
                return res.status(409).json({
                    message: "Account already exists",
                });
            }
            return res.status(400).json({
                message: err.message || "Failed to create account",
            });
        }
    },

    // Request OTP for restaurant signup (can also be used to resend)
    async requestRestaurantSignupOTP(req: Request, res: Response) {
        const parsed = requestRestaurantOTPSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.requestRestaurantSignupOTP(req);
            return res.json(result);
        } catch (err: any) {
            if (err.message?.includes("already registered")) {
                return res.status(409).json({
                    message: err.message,
                });
            }
            // Handle email/SMS sending errors
            if (err.message?.includes("Failed to send")) {
                return res.status(500).json({
                    message: err.message,
                });
            }
            return res.status(400).json({
                message: err.message || "Failed to send OTP",
            });
        }
    },

    // Resend OTP for restaurant signup (same as request, but explicit endpoint)
    async resendRestaurantSignupOTP(req: Request, res: Response) {
        // Same logic as requestRestaurantSignupOTP - resending is just requesting again
        return this.requestRestaurantSignupOTP(req, res);
    },

    // Verify OTP for restaurant signup
    async verifyRestaurantSignupOTP(req: Request, res: Response) {
        const parsed = verifyRestaurantOTPSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.verifyRestaurantSignupOTP(req);
            return res.json({
                message: "OTP verified successfully",
                verified: true,
                verificationToken: result.verificationToken,
                identifier: result.identifier,
                identifierType: result.identifierType,
            });
        } catch (err: any) {
            return res.status(400).json({
                message: err.message || "OTP verification failed",
            });
        }
    },

    // Complete restaurant profile and create account
    async completeRestaurantProfile(req: Request, res: Response) {
        const parsed = completeRestaurantProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.completeRestaurantProfile(req);
            
            const sessionToken = (result as any)?.session?.token || (result as any)?.token;
            if (sessionToken) {
                res.cookie("better-auth.session_token", sessionToken, getCookieOptions());
            }
            
            // Check if password was provided
            const needsPassword = !req.body.password;
            
            return res.status(201).json({
                message: needsPassword 
                    ? "Restaurant account created successfully. Please set your password using /auth/set-password endpoint."
                    : "Restaurant account created successfully",
                data: {
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                        role: result.user.role,
                    },
                    restaurant: result.restaurant,
                },
                ...(needsPassword && { requiresPassword: true }),
            });
        } catch (err: any) {
            if (err.message?.includes("already exists") || err.message?.includes("unique")) {
                return res.status(409).json({
                    success: false,
                    message: "Email already registered",
                });
            }
            if (err.message?.includes("Phone number") && err.message?.includes("already registered")) {
                return res.status(409).json({
                    success: false,
                    message: err.message,
                });
            }
            if (err.message?.includes("required") || err.message?.includes("Invalid")) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "Validation error",
                });
            }
            return res.status(500).json({
                success: false,
                message: err.message || "Restaurant signup failed",
            });
        }
    },

    // Set password for authenticated user
    async setPassword(req: Request, res: Response) {
        const parsed = setPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.setPassword(req);
            return res.json(result);
        } catch (err: any) {
            if (err.message?.includes("not authenticated") || err.message?.includes("User not found")) {
                return res.status(401).json({
                    message: err.message,
                });
            }
            if (err.message?.includes("already set")) {
                return res.status(400).json({
                    message: err.message,
                });
            }
            return res.status(400).json({
                message: err.message || "Failed to set password",
            });
        }
    },

    // Request password reset OTP
    async requestPasswordReset(req: Request, res: Response) {
        const parsed = requestPasswordResetSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.requestPasswordReset(req);
            return res.json(result);
        } catch (err: any) {
            if (err.message?.includes("No account found")) {
                return res.status(404).json({
                    message: err.message,
                });
            }
            if (err.message?.includes("Failed to send")) {
                return res.status(500).json({
                    message: err.message,
                });
            }
            return res.status(400).json({
                message: err.message || "Failed to send password reset OTP",
            });
        }
    },

    // Verify password reset OTP
    async verifyPasswordResetOTP(req: Request, res: Response) {
        const parsed = verifyPasswordResetOTPSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.verifyPasswordResetOTP(req);
            return res.json({
                message: "OTP verified successfully",
                verified: true,
                verificationToken: result.verificationToken,
                identifier: result.identifier,
                identifierType: result.identifierType,
            });
        } catch (err: any) {
            return res.status(400).json({
                message: err.message || "OTP verification failed",
            });
        }
    },

    // Reset password
    async resetPassword(req: Request, res: Response) {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.flatten());
        }

        try {
            const result = await authService.resetPassword(req);
            return res.json(result);
        } catch (err: any) {
            if (err.message?.includes("Invalid token") || err.message?.includes("expired")) {
                return res.status(400).json({
                    message: err.message,
                });
            }
            if (err.message?.includes("User not found")) {
                return res.status(404).json({
                    message: err.message,
                });
            }
            return res.status(400).json({
                message: err.message || "Failed to reset password",
            });
        }
    },

    //Get current session
    async me(req: Request, res: Response){
        try{
            const session= await authService.getSession(req);
            return res.json(session);
        }
        catch (err:any) {
            // Handle system integrity errors
            if (err.message?.includes("System integrity error")) {
                return res.status(500).json({
                    message: err.message
                });
            }
            return res.status(401).json({
                message: "Not authenticated"
            });
        }
    },

};
