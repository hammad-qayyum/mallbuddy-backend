import {Request, Response} from "express";
import {userService} from "./user.service";

import{
    updateUserProfileSchema,
    changePasswordSchema,
} from "./user.schema"


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

        const updated= await userService.updateProfile(userId, parsed.data);
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
            return res.status(400).json({
                message: err.message
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

};