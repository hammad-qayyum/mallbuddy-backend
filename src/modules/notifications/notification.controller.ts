import prisma from "../../config/prisma";
import { Request, Response } from "express";

/**
 * Notification Controller
 * 
 * Handles HTTP requests related to push notification registration.
 * 
 * @module notifications/notification.controller
 */

/**
 * Registers an Expo push token for the authenticated user
 * 
 * This endpoint allows users to register their Expo push notification token
 * so they can receive push notifications for order updates and other events.
 * 
 * @route POST /notifications/register-token
 * @access Private
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * POST /notifications/register-token
 * Body: { "expoPushToken": "ExponentPushToken[xxxxx]" }
 */
export const registerExpoToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        success: false,
        message: "Unauthorized: User not authenticated" 
      });
      return;
    }

    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      res.status(400).json({ 
        success: false,
        message: "expoPushToken is required" 
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });

    console.log(`[Notification] Registered push token for user ${userId}`);
    
    res.json({ 
      success: true,
      message: "Push token registered successfully" 
    });
  } catch (error: any) {
    console.error("[Notification] Error registering push token:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to register push token" 
    });
  }
};
