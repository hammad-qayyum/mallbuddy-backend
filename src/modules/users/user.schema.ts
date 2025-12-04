import {z} from "zod";

//Schema for updating general profile data
export const updateUserProfileSchema = z.object({
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    email: z.string().email("Invalid email format").optional(),
    phoneNumber: z.string().min(11, "Phone number must be at least 11 digits").optional(),
    image: z.string().url("Image must be a valid URL").optional(),
});

//Schema for updating password
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z.string().min(6, "New password must be atleast 6 characters"),
});

export const updateUserMallSchema = z.object({
    mallId: z.string().uuid("Invalid mall ID"),
  });
  
//Types inferred from schemas
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserMallInput = z.infer<typeof updateUserMallSchema>;