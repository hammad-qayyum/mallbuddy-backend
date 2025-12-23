import {Request, Response} from "express";
import {userService} from "./user.service";

import{
    updateUserProfileSchema,
    changePasswordSchema,
    updateUserMallSchema,
    updateUserCountrySchema,
    updateUserCitySchema,
} from "./user.schema"
import { uploadProfilePicture, getProfilePictureUrl } from "../../config/upload";


export const userController = {

    //Get current user profile
    async getMyProfile(req: Request, res: Response){
        const auth= (req as any).auth;
        const userId= auth.user.id;

        const user= await userService.getMyProfile(userId);
        return res.json(user);
    },


    //Patch current user's profile
    async updateProfile(req: Request, res: Response){
        const auth=(req as any).auth;
        const userId= auth.user.id;

        const parsed= updateUserProfileSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json(parsed.error.flatten());
        }

        // If file is uploaded, use it; otherwise use URL from body if provided
        const data = { ...parsed.data };
        if (req.file) {
            data.image = getProfilePictureUrl(req.file.filename);
        }

        const updated= await userService.updateProfile(userId, data);
        return res.json(updated);
    },


    //Patch current user's password
    async changePassword(req: Request, res: Response){
        const auth= (req as any).auth;
        const userId= auth.user.id;

        const parsed= changePasswordSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json(parsed.error.flatten());
        }

        try{
            await userService.changePassword(userId, parsed.data, req);
            return res.json({
                message: "Password updated successfully"
            });
        }
        catch (err:any) {
            // Log the error for debugging
            console.error("Password change error:", err);
            return res.status(400).json({
                message: err.message || "Failed to change password"
            })
        }
    },


    //Delete current user
    async deleteMyProfile(req: Request, res: Response){
        const auth= (req as any).auth;
        const userId= auth.user.id;

        await userService.deleteMyProfile(userId);
        return res.status(204).send(); //no content
    },

    //Upload profile picture
    async uploadProfilePicture(req: Request, res: Response){
        const auth= (req as any).auth;
        const userId= auth.user.id;

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded. Please provide a profile picture."
            });
        }

        try {
            const updatedUser = await userService.uploadProfilePicture(userId, req.file.filename);
            return res.json({
                message: "Profile picture uploaded successfully",
                user: updatedUser
            });
        } catch (err: any) {
            return res.status(400).json({
                message: err.message || "Failed to upload profile picture"
            });
        }
    },


      async updateMyMall(req: Request, res: Response) {
        const auth= (req as any).auth;
        const userId= auth.user.id;
    
        const parsed = updateUserMallSchema.safeParse(req.body);
    
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid request body",
            errors: parsed.error.flatten(),
          });
        }
    
        try {
          const updatedUser = await userService.updateUserMall(
            userId,
            parsed.data
          );
    
          return res.json({
            message: "Mall selected successfully",
            user: updatedUser,
          });
        } catch (err: any) {
          if (err.message === "Mall not found") {
            return res.status(404).json({ message: "Mall not found" });
          }
    
          return res.status(500).json({
            message: "Failed to update mall selection",
            error: err.message,
          });
        }
      },

    async updateMyCountry(req: Request, res: Response) {
        const auth= (req as any).auth;
        const userId= auth.user.id;
    
        const parsed = updateUserCountrySchema.safeParse(req.body);
    
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid request body",
            errors: parsed.error.flatten(),
          });
        }
    
        try {
          const updatedUser = await userService.updateUserCountry(
            userId,
            parsed.data
          );
    
          return res.json({
            message: "Country selected successfully",
            user: updatedUser,
          });
        } catch (err: any) {
          if (err.message === "Country not found") {
            return res.status(404).json({ message: "Country not found" });
          }
    
          return res.status(500).json({
            message: "Failed to update country selection",
            error: err.message,
          });
        }
      },

    async updateMyCity(req: Request, res: Response) {
        const auth= (req as any).auth;
        const userId= auth.user.id;
    
        const parsed = updateUserCitySchema.safeParse(req.body);
    
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid request body",
            errors: parsed.error.flatten(),
          });
        }
    
        try {
          const updatedUser = await userService.updateUserCity(
            userId,
            parsed.data
          );
    
          return res.json({
            message: "City selected successfully",
            user: updatedUser,
          });
        } catch (err: any) {
          if (err.message === "City not found") {
            return res.status(404).json({ message: "City not found" });
          }
    
          return res.status(500).json({
            message: "Failed to update city selection",
            error: err.message,
          });
        }
      },

    
 // POST /users/create-stripe-customer
 async createStripeCustomer(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;

    if (!auth || !auth.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const userId = auth.user.id;

    const user = await userService.createStripeCustomer(userId);

    return res.status(201).json({
      message: "Stripe customer created successfully",
      user,
    });
  } catch (error: any) {
    if (error.message === "User not found") {
      return res.status(404).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: error.message ?? "Something went wrong",
    });
  }
},
};