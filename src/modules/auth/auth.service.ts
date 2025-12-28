import {Request} from "express";
import prisma from "../../config/prisma";
import {auth} from "../../libs/betterauth";
import {
    expressHeadersToFetch,
    normalizePhoneNumber,
    phoneAsAliasEmail,
} from "../common/utils";
import { createRestaurantService } from "../restaurant/createRestaurant.service";
import { RestaurantSignupInput } from "../restaurant/restaurant.schema";

const resolveIdentifier = (email?: string, phoneNumber?: string) => {
    if (email) {
        return {email, normalizedPhone: phoneNumber ? normalizePhoneNumber(phoneNumber) : undefined};
    }

    if (phoneNumber) {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        return {email: phoneAsAliasEmail(normalizedPhone), normalizedPhone};
    }

    throw new Error("Email or phone number is required");
};

export const authService = {

    //Register a new user
    async register(req: Request){
        const {firstName, lastName, email, phoneNumber, password} = req.body;
        const {email: identifierEmail, normalizedPhone} = resolveIdentifier(
            email,
            phoneNumber
        );

    //full name for better auth(derived from first and last name)
    const fullName = `${firstName} ${lastName}`;
        const result = await auth.api.signUpEmail({
            body: {email: identifierEmail, password, name: fullName},
            headers: expressHeadersToFetch(req),
        });

        // Always update firstName/lastName on our Prisma user.
        // Conditionally set phoneNumber if we have a normalized phone.
        await prisma.user.update({
            where: {id: result.user.id},
            data: {
                firstName,
                lastName,
                ...(normalizedPhone && {phoneNumber: normalizedPhone}),
            },
        });

        return result;
    },


    //Login user
    async login(req: Request){
        const {email, phoneNumber, password} = req.body;
        const {email: identifierEmail} = resolveIdentifier(email, phoneNumber);

        return await auth.api.signInEmail({
            body: {email: identifierEmail, password},
            headers: expressHeadersToFetch(req),
        });
    },


    //Logout user
    async logout(req: Request){
        const cookieToken =
            (req as any).cookies?.["better-auth.session_token"] ??
            (req as any).cookies?.betterAuthSessionToken;

        if (!cookieToken) {
            throw new Error("Failed to get session");
        }

        try {
            await prisma.session.delete({
                where: {token: cookieToken},
            });
        } catch {
            // If no session found, treat as already logged out
        }

        return {message: "Logged out successfully"};
    },


    /**
     * Restaurant self-signup
     * Creates User(role=RESTAURANT) and Restaurant atomically
     */
    async restaurantSignup(req: Request) {
        const {
            email,
            password,
            phoneNumber,
            firstName,
            lastName,
            // Restaurant details
            mallId,
            name,
            mainCategory,
            description,
            location,
            cuisineCategoryId,
        } = req.body;

        return await createRestaurantService.createRestaurantUserWithRestaurant(
            {
                email,
                password,
                phoneNumber,
                firstName,
                lastName,
                mallId,
                name,
                mainCategory,
                description,
                location,
                cuisineCategoryId,
            },
            req
        );
    },

    //Get current session
    async getSession(req: Request){
        const cookieToken =
            (req as any).cookies?.["better-auth.session_token"] ??
            (req as any).cookies?.betterAuthSessionToken;

        if (!cookieToken) {
            return null;
        }

        const session = await prisma.session.findUnique({
            where: {token: cookieToken},
            include: {
                user: {
                    include: {
                        restaurant: true, // Single query to check restaurant existence
                    },
                },
            },
        });

        if (!session) {
            return null;
        }

        // Optional: enforce expiration
        if (session.expiresAt && session.expiresAt < new Date()) {
            return null;
        }

        // CRITICAL: Validate RESTAURANT users always have a Restaurant
        if (session.user.role === "RESTAURANT") {
            if (!session.user.restaurant) {
                // System error: RESTAURANT user without restaurant
                console.error(
                    `SYSTEM ERROR: User ${session.user.id} has role RESTAURANT but no Restaurant record`
                );
                throw new Error(
                    "System integrity error: Restaurant account is incomplete. Please contact support."
                );
            }
        }

        // CRITICAL: Validate USER/ADMIN never have a Restaurant
        if ((session.user.role === "USER" || session.user.role === "ADMIN") && session.user.restaurant) {
            console.error(
                `SYSTEM ERROR: User ${session.user.id} has role ${session.user.role} but has Restaurant record`
            );
            throw new Error(
                "System integrity error: Invalid user-restaurant relationship. Please contact support."
            );
        }

        return {
            user: session.user,
            session: {
                id: session.id,
                token: session.token,
                expiresAt: session.expiresAt,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
            },
        };
    },

};
