import {z} from "zod";

const phoneNumberSchema = z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid phone number");

const identifierSchema = z
    .object({
        email: z.string().email().optional(),
        phoneNumber: phoneNumberSchema.optional(),
    })
    .refine(
        (data) => data.email || data.phoneNumber,
        "Provide either email or phone number"
    );

// Schema for user registration
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
