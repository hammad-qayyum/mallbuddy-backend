import { Request, Response } from "express";
import * as service from "./restaurantconnect.service";

/**
 * ✅ Create or reuse Stripe Connect account
 * NEVER creates duplicates
 */
export async function createStripeConnectAccount(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;

    if (!auth?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const accountId =
      await service.getOrCreateRestaurantStripeAccount(restaurantId);

    return res.status(200).json({
      success: true,
      message: "Stripe Connect account ready",
      data: { accountId },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create Stripe Connect account",
    });
  }
}

/**
 * ✅ Get onboarding link
 */
export async function getOnboardingLink(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const url = await service.generateOnboardingLink(
      restaurantId as string
    );

    return res.status(200).json({
      success: true,
      message: "Onboarding link generated",
      data: { url },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to generate onboarding link",
    });
  }
}

/**
 * Get Stripe account status
 */
export async function getStripeAccountStatus(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const status = await service.getRestaurantStripeAccountStatus(
      restaurantId as string
    );

    return res.status(200).json({
      success: true,
      message: "Account status retrieved successfully",
      data: status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve account status",
    });
  }
}
