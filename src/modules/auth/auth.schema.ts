import {z} from "zod";

// Enhanced phone number validation - E.164 format
const phoneNumberSchema = z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890)")
    .refine((val) => {
        // Additional validation: must start with + and have 10-15 digits after country code
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
    }, "Phone number must have 10-15 digits");

// Enhanced email validation - checks for common fake email patterns
const emailSchema = z
    .string()
    .email("Enter a valid email address")
    .refine((val) => {
        // Block common fake email domains
        const fakeDomains = [
            "tempmail.com",
            "10minutemail.com",
            "guerrillamail.com",
            "mailinator.com",
            "throwaway.email",
            "temp-mail.org",
            "fakemail.com",
            "disposable.com",
        ];
        const domain = val.split("@")[1]?.toLowerCase();
        return !fakeDomains.some(fake => domain?.includes(fake));
    }, "Disposable email addresses are not allowed")
    .refine((val) => {
        // Check for valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val);
    }, "Invalid email format");

const identifierSchema = z
    .object({
        email: emailSchema.optional(),
        phoneNumber: phoneNumberSchema.optional(),
    })
    .refine(
        (data) => data.email || data.phoneNumber,
        "Provide either email or phone number"
    );

// Schema for requesting OTP (user signup)
export const requestUserOTPSchema = identifierSchema;

// Schema for requesting OTP (restaurant signup)
export const requestRestaurantOTPSchema = identifierSchema;

// Schema for verifying OTP (user signup)
export const verifyUserOTPSchema = identifierSchema.safeExtend({
    otp: z.string().length(6, "OTP must be 6 digits"),
});

// Schema for verifying OTP (restaurant signup)
export const verifyRestaurantOTPSchema = identifierSchema.safeExtend({
    otp: z.string().length(6, "OTP must be 6 digits"),
});

// Schema for completing user profile after OTP verification
export const completeUserProfileSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    verificationToken: z.string().min(1, "Verification token is required"),
    // Optional: allow adding phone number if verified with email, or email if verified with phone
    phoneNumber: phoneNumberSchema.optional(),
    email: emailSchema.optional(),
});

// Schema for setting password after account creation
export const setPasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for requesting password reset
export const requestPasswordResetSchema = identifierSchema;

// Schema for verifying password reset OTP
export const verifyPasswordResetOTPSchema = identifierSchema.safeExtend({
    otp: z.string().length(6, "OTP must be 6 digits"),
});

// Schema for resetting password
export const resetPasswordSchema = z.object({
    verificationToken: z.string().min(1, "Verification token is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for completing restaurant profile after OTP verification
export const completeRestaurantProfileSchema = z.object({
    // User fields
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
    verificationToken: z.string().min(1, "Verification token is required"),
    // Restaurant fields
    name: z.string().min(1, "Restaurant name is required"),
    location: z.string().min(1, "Address/location is required"),
    description: z.string().min(1, "Restaurant details are required"),
    phoneNumber: phoneNumberSchema.min(1, "Phone number is required"),
    mallId: z.string().min(1, "Mall ID is required"),
    // Optional restaurant fields
    mainCategory: z.string().optional(),
    cuisineCategoryId: z.string().optional(),
    // Optional: allow adding email if verified with phone
    email: emailSchema.optional(),
});

// Schema for user registration (keep for backward compatibility)
// We take firstName + lastName separately and derive `name` only inside the service for Better Auth.
export const registerSchema = identifierSchema.safeExtend({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z.string().min(6),
});

//Schema for user login
export const loginSchema = identifierSchema.safeExtend({
    password: z.string().min(6),
});
