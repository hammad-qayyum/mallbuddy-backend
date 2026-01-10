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
import { otpService } from "./otp.service";
import { hashPassword } from "better-auth/crypto";

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

        // Note: User can login with either email OR phone number
        // The resolveIdentifier function converts phone to alias email
        // So if user has both email and phone, they can login with either
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

    /**
     * Request OTP for user signup
     */
    async requestUserSignupOTP(req: Request) {
        const { email, phoneNumber } = req.body;
        return await otpService.requestOTP(email, phoneNumber, "user");
    },

    /**
     * Verify OTP for user signup
     */
    async verifyUserSignupOTP(req: Request) {
        const { email, phoneNumber, otp } = req.body;
        return await otpService.verifyOTP(email, phoneNumber, otp, "user");
    },

    /**
     * Complete user profile and create account after OTP verification
     */
    async completeUserProfile(req: Request) {
        const { firstName, lastName, password, verificationToken, phoneNumber: additionalPhoneNumber, email: additionalEmail } = req.body;
        
        // Get verified identifier from token
        const verifiedData = await otpService.getVerifiedIdentifier(verificationToken);
        
        let verifiedEmail: string | undefined;
        let verifiedPhone: string | undefined;
        let additionalEmailToStore: string | undefined;
        let additionalPhoneToStore: string | undefined;
        
        if (verifiedData.identifierType === "email") {
            verifiedEmail = verifiedData.identifier;
            // Allow adding phone number if verified with email
            if (additionalPhoneNumber) {
                additionalPhoneToStore = additionalPhoneNumber;
            }
        } else {
            verifiedPhone = verifiedData.identifier;
            // Allow adding email if verified with phone
            if (additionalEmail) {
                additionalEmailToStore = additionalEmail;
            }
        }

        // For Better Auth signup, we need to use the verified identifier
        // If verified with phone, Better Auth gets phone alias email
        // If verified with email, Better Auth gets the real email
        const { email: identifierEmail, normalizedPhone } = resolveIdentifier(
            verifiedEmail,  // Only use verified email (not additional)
            verifiedPhone   // Only use verified phone (not additional)
        );

        const fullName = `${firstName} ${lastName}`;
        
        // If password is provided, create account with password
        // Otherwise, create account without password (user will set it later)
        let result;
        if (password) {
            result = await auth.api.signUpEmail({
                body: { email: identifierEmail, password, name: fullName },
                headers: expressHeadersToFetch(req),
            });
        } else {
            // Create account without password - Better Auth requires a password, so we'll use a temporary one
            // User will need to set their password via the setPassword endpoint
            const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            result = await auth.api.signUpEmail({
                body: { email: identifierEmail, password: tempPassword, name: fullName },
                headers: expressHeadersToFetch(req),
            });
        }

        // Delete verification token after use
        await prisma.verification.deleteMany({
            where: { identifier: `token:${verificationToken}` },
        });

        // Set verification status based on what was verified
        const updateData: any = {
            firstName,
            lastName,
        };

        // Store verified phone number
        if (verifiedPhone) {
            const normalizedVerifiedPhone = normalizePhoneNumber(verifiedPhone);
            updateData.phoneNumber = normalizedVerifiedPhone;
            updateData.phoneVerified = true;
        }

        // Store verified email (Better Auth already has it, but ensure it's in our User table)
        if (verifiedEmail) {
            // Better Auth User.email will be the verified email
            // Our User.email should match (it's already set by Better Auth)
            updateData.emailVerified = true;
        }

        // Add additional phone if verified with email
        if (additionalPhoneToStore && verifiedData.identifierType === "email") {
            const normalizedAdditionalPhone = normalizePhoneNumber(additionalPhoneToStore);
            updateData.phoneNumber = normalizedAdditionalPhone;
            updateData.phoneVerified = false; // Added but not verified
        }

        // Add additional email if verified with phone
        if (additionalEmailToStore && verifiedData.identifierType === "phone") {
            // Update the email field in User table with the real email
            // This will also update Better Auth's user email
            // User can still login with phone (via resolveIdentifier conversion)
            updateData.email = additionalEmailToStore;
            updateData.emailVerified = false; // Added but not verified
        }

        await prisma.user.update({
            where: { id: result.user.id },
            data: updateData,
        });

        return result;
    },

    /**
     * Request OTP for restaurant signup
     */
    async requestRestaurantSignupOTP(req: Request) {
        const { email, phoneNumber } = req.body;
        return await otpService.requestOTP(email, phoneNumber, "restaurant");
    },

    /**
     * Verify OTP for restaurant signup
     */
    async verifyRestaurantSignupOTP(req: Request) {
        const { email, phoneNumber, otp } = req.body;
        return await otpService.verifyOTP(email, phoneNumber, otp, "restaurant");
    },

    /**
     * Complete restaurant profile and create account after OTP verification
     */
    async completeRestaurantProfile(req: Request) {
        const {
            firstName,
            lastName,
            password,
            verificationToken,
            // Restaurant fields
            name,
            location,
            description,
            phoneNumber: restaurantPhoneNumber,
            mallId,
            mainCategory,
            cuisineCategoryId,
            email: additionalEmail, // Allow adding email if verified with phone
        } = req.body;

        // Get verified identifier from token
        const verifiedData = await otpService.getVerifiedIdentifier(verificationToken);
        
        // Determine email and phone from verified identifier
        let verifiedEmail: string | undefined;
        let verifiedPhone: string | undefined;
        
        if (verifiedData.identifierType === "email") {
            verifiedEmail = verifiedData.identifier;
        } else {
            verifiedPhone = verifiedData.identifier;
        }

        // Use restaurant phone number if provided, otherwise use verified identifier if it was a phone
        const finalPhoneNumber = restaurantPhoneNumber || (verifiedData.identifierType === "phone" ? verifiedPhone : undefined);
        
        // Use verified email, or additional email if verified with phone
        const finalEmail = verifiedEmail || (verifiedData.identifierType === "phone" && additionalEmail ? additionalEmail : undefined);

        // Delete verification token after use
        await prisma.verification.deleteMany({
            where: { identifier: `token:${verificationToken}` },
        });

        // If password is not provided, use a temporary password
        const finalPassword = password || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        // Use the existing restaurant signup service
        const result = await createRestaurantService.createRestaurantUserWithRestaurant(
            {
                email: finalEmail, // Use verified email or additional email
                password: finalPassword,
                phoneNumber: finalPhoneNumber,
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

        // Set verification status based on what was verified
        // Also handle additional email if provided
        const updateData: any = {};
        
        if (verifiedData.identifierType === "email") {
            updateData.emailVerified = true;
            // Phone number is required for restaurant, mark as unverified if not the verified identifier
            if (finalPhoneNumber) {
                updateData.phoneVerified = false;
            }
        } else {
            updateData.phoneVerified = true;
            // If additional email was provided, update it and mark as unverified
            if (additionalEmail) {
                updateData.email = additionalEmail;
                updateData.emailVerified = false;
            }
        }

        await prisma.user.update({
            where: { id: result.user.id },
            data: updateData,
        });

        return result;
    },

    /**
     * Set password for user account (if not already set)
     */
    async setPassword(req: Request) {
        const { password } = req.body;
        const session = await this.getSession(req);

        if (!session || !session.user) {
            throw new Error("User not authenticated");
        }

        const userId = session.user.id;

        // Check if user already has a password set
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                accounts: {
                    where: {
                        providerId: "credential",
                    },
                },
            },
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Check if password is already set (not a temporary password)
        const credentialAccount = user.accounts.find(acc => acc.providerId === "credential");
        
        // Better check: if password exists and is not a temp password pattern
        // Temp passwords start with "temp_" in plain text, but after hashing they won't contain "temp_"
        // So we check if the account exists and has a password that's properly hashed (starts with $2a$ or similar)
        const hasPassword = credentialAccount?.password && 
            (credentialAccount.password.startsWith("$2a$") || 
             credentialAccount.password.startsWith("$2b$") || 
             credentialAccount.password.startsWith("$scrypt$"));

        if (hasPassword) {
            throw new Error("Password is already set. Use change password endpoint to update it.");
        }

        // Update password in Account table directly
        // Use Better Auth's password hashing mechanism
        const hashedPassword = await hashPassword(password);

        if (credentialAccount) {
            // Update existing account password
            await prisma.account.update({
                where: { id: credentialAccount.id },
                data: { password: hashedPassword },
            });
        } else {
            // Create new credential account
            await prisma.account.create({
                data: {
                    userId: userId,
                    accountId: user.email,
                    providerId: "credential",
                    password: hashedPassword,
                },
            });
        }

        return {
            message: "Password set successfully",
        };
    },

    /**
     * Request password reset OTP
     */
    async requestPasswordReset(req: Request) {
        const { email, phoneNumber } = req.body;
        return await otpService.requestPasswordResetOTP(email, phoneNumber);
    },

    /**
     * Verify password reset OTP
     */
    async verifyPasswordResetOTP(req: Request) {
        const { email, phoneNumber, otp } = req.body;
        return await otpService.verifyPasswordResetOTP(email, phoneNumber, otp);
    },

    /**
     * Reset password using verification token
     */
    async resetPassword(req: Request) {
        const { verificationToken, newPassword } = req.body;
        
        // Get verified identifier from token
        const verifiedData = await otpService.getVerifiedIdentifier(verificationToken);
        
        if (verifiedData.purpose !== "password-reset") {
            throw new Error("Invalid token for password reset");
        }

        // Find user by identifier
        let user;
        if (verifiedData.identifierType === "email") {
            user = await prisma.user.findUnique({
                where: { email: verifiedData.identifier },
                include: {
                    accounts: {
                        where: {
                            providerId: "credential",
                        },
                    },
                },
            });
        } else {
            const normalizedPhone = normalizePhoneNumber(verifiedData.identifier);
            user = await prisma.user.findUnique({
                where: { phoneNumber: normalizedPhone },
                include: {
                    accounts: {
                        where: {
                            providerId: "credential",
                        },
                    },
                },
            });
        }

        if (!user) {
            throw new Error("User not found");
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update or create credential account
        const credentialAccount = user.accounts.find(acc => acc.providerId === "credential");
        
        if (credentialAccount) {
            await prisma.account.update({
                where: { id: credentialAccount.id },
                data: { password: hashedPassword },
            });
        } else {
            await prisma.account.create({
                data: {
                    userId: user.id,
                    accountId: user.email,
                    providerId: "credential",
                    password: hashedPassword,
                },
            });
        }

        // Delete verification token after use
        await prisma.verification.deleteMany({
            where: { identifier: `token:${verificationToken}` },
        });

        return {
            message: "Password reset successfully",
        };
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
