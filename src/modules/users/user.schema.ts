import {z} from "zod";

// Helper function to transform empty strings to undefined and apply validation
// This allows fields to be truly optional - empty strings are treated as "not provided"
const optionalString = (validation: z.ZodString) => {
    return z.preprocess(
        (val) => {
            // Convert empty strings, null, or undefined to undefined
            if (val === "" || val === null || val === undefined) {
                return undefined;
            }
            return val;
        },
        z.union([validation, z.undefined()])
    );
};

//Schema for updating general profile data
// All fields are optional - empty strings are treated as undefined (field not provided)
export const updateUserProfileSchema = z.object({
    firstName: optionalString(z.string().min(1, "First name is required")),
    lastName: optionalString(z.string().min(1, "Last name is required")),
    email: optionalString(z.string().email("Invalid email format")),
    phoneNumber: optionalString(z.string().min(11, "Phone number must be at least 11 digits")),
    image: optionalString(z.string().url("Image must be a valid URL")),
});

//Schema for updating password
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z.string().min(6, "New password must be atleast 6 characters"),
});

export const updateUserMallSchema = z.object({
    mallId: z.string().uuid("Invalid mall ID"),
  });

export const updateUserCountrySchema = z.object({
    countryId: z.string().uuid("Invalid country ID"),
  });

export const updateUserCitySchema = z.object({
    cityId: z.string().uuid("Invalid city ID"),
  });

//Types inferred from schemas
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserMallInput = z.infer<typeof updateUserMallSchema>;
export type UpdateUserCountryInput = z.infer<typeof updateUserCountrySchema>;
export type UpdateUserCityInput = z.infer<typeof updateUserCitySchema>;