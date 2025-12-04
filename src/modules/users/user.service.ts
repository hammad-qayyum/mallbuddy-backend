import prisma from "../../config/prisma";
import {
    UpdateUserProfileInput,
    ChangePasswordInput,
    UpdateUserMallInput,
  } from "./user.schema";
import { normalizePhoneNumber } from "../common/utils";
import { auth } from "../../libs/betterauth";
import { buildBetterAuthHeaders } from "../common/utils";
import { getProfilePictureUrl, deleteImageFile } from "../../config/upload";
import path from "path";
import fs from "fs";

export const userService = {

    //get the current user's full profile
    async getMyProfile(userId: string){
        return prisma.user.findUnique({
            where: {id: userId},
        });
    },

    //update profile fields of the current user
    async updateProfile(userId: string, data: UpdateUserProfileInput){
        // Get current user to check for existing image and name fields
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { image: true, firstName: true, lastName: true },
        });

        const updateData: any = {};
        
        // Handle email if provided
        if (data.email !== undefined) {
            updateData.email = data.email;
        }
        
        // Handle phone number normalization if provided
        if (data.phoneNumber !== undefined && data.phoneNumber !== null) {
            const normalized = normalizePhoneNumber(data.phoneNumber);
            // Only set if normalized result has at least 11 digits (matching schema validation)
            if (normalized.length >= 11) {
                updateData.phoneNumber = normalized;
            } else {
                throw new Error("Phone number must be at least 11 digits after normalization");
            }
        } else if (data.phoneNumber === null) {
            // Explicitly allow setting to null to clear the phone number
            updateData.phoneNumber = null;
        }
        
        // Handle firstName and lastName
        if (data.firstName !== undefined) {
            updateData.firstName = data.firstName;
        }
        if (data.lastName !== undefined) {
            updateData.lastName = data.lastName;
        }
        
        // Handle image
        if (data.image !== undefined) {
            // Delete old image if it exists and is a local file
            if (currentUser?.image && currentUser.image.startsWith("/uploads/")) {
                deleteImageFile(currentUser.image);
            }
            updateData.image = data.image;
        }
        
        // If firstName or lastName is being updated, we need to also update Better Auth's `name` field
        if (data.firstName !== undefined || data.lastName !== undefined) {
            if (currentUser) {
                const newFirstName = data.firstName ?? currentUser.firstName ?? "";
                const newLastName = data.lastName ?? currentUser.lastName ?? "";
                
                // Update Better Auth's `name` field (used internally by Better Auth)
                if (newFirstName || newLastName) {
                    updateData.name = `${newFirstName} ${newLastName}`.trim();
                }
            }
        }

        return prisma.user.update({
            where: {id: userId},
            data: updateData,
        });
    },


    //change the user's password
    async changePassword(userId: string, data: ChangePasswordInput, req: any){

        //1. Get the user to find their email
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if(!user || !user.email){
            throw new Error("User not found");
        }

        //2. Verify current password by attempting to login with Better Auth
        // This ensures we're using the same password verification method Better Auth uses
        try {
            await auth.api.signInEmail({
                body: {
                    email: user.email,
                    password: data.currentPassword,
                },
                headers: buildBetterAuthHeaders(req),
            });
        } catch (error) {
            throw new Error("Current password is incorrect");
        }

        //3. Find the account with password to update it
        const accounts = await prisma.account.findMany({
            where: { userId },
        });

        const account = accounts.find(acc => acc.password !== null && acc.password !== undefined);

        if(!account){
            throw new Error("No password account found for this user");
        }

        //4. Hash new password using bcrypt (Better Auth uses bcrypt with 10 rounds)
        const { hash } = await import("bcryptjs");
        const hashedPassword = await hash(data.newPassword, 10);

        //5. Update the password in the Account table
        await prisma.account.update({
            where: {id: account.id},
            data:{password: hashedPassword},
        });
        
        return {success: true};
    },


    //delete current user(and cascade will the related data)
    async deleteMyProfile(userId: string){
        await prisma.user.delete({
            where: {id: userId},
        });
        return {success: true};
    },

    //upload profile picture
    async uploadProfilePicture(userId: string, filename: string){
        // Get current user to check for existing profile picture
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { image: true },
        });

        // Delete old profile picture if it exists and is a local file
        if (currentUser?.image) {
            const oldImagePath = currentUser.image;
            // Check if it's a local file (starts with /uploads)
            if (oldImagePath.startsWith("/uploads/profile-pictures/")) {
                const oldFilename = path.basename(oldImagePath);
                const oldFilePath = path.join(process.cwd(), "uploads", "profile-pictures", oldFilename);
                
                // Delete old file if it exists
                if (fs.existsSync(oldFilePath)) {
                    try {
                        fs.unlinkSync(oldFilePath);
                    } catch (error) {
                        // Log error but don't fail the upload
                        console.error("Error deleting old profile picture:", error);
                    }
                }
            }
        }

        // Generate URL for the new profile picture
        const imageUrl = getProfilePictureUrl(filename);

        // Update user's image field in database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: imageUrl },
        });

        return updatedUser;
    },




    async updateUserMall(userId: string, data: UpdateUserMallInput) {
        // Check if mall exists
        const mall = await prisma.mall.findUnique({
          where: { id: data.mallId },
        });
    
        if (!mall) {
          throw new Error("Mall not found");
        }
    
        // Update user's selected mall
        return prisma.user.update({
          where: { id: userId },
          data: { selectedMallId: data.mallId },
          include: {
            mall: true,
          },
        });
      },
};