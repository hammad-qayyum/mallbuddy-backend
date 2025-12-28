import {Request, Response} from "express";
import {authService} from "./auth.service";

import{
    registerSchema,
    loginSchema,
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
                res.cookie("better-auth.session_token", sessionToken, {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    // secure: true, // enable in production over HTTPS
                });
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
                res.cookie("better-auth.session_token", sessionToken, {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    // secure: true, // enable in production over HTTPS
                });
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
            res.clearCookie("better-auth.session_token", {
                path: "/",
            });
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
                res.cookie("better-auth.session_token", sessionToken, {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    // secure: true, // enable in production over HTTPS
                });
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
