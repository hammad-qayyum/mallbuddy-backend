import { Request, Response } from "express";
import onboardingService from "./onboarding.service";
import { getOnboardingProgressSchema } from "./onboarding.schema";

export const onboardingController = {
  /**
   * GET /restaurant/:restaurantId/onboarding/progress
   * Get restaurant onboarding progress
   * Shows completion percentage based on:
   * - Cuisine type (33%)
   * - Business hours (66%)
   * - Banner image (100%)
   * Public endpoint - anyone can view
   */
  async getProgress(req: Request, res: Response) {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ success: false, message: "Restaurant ID is required" });
    }

    try {
      const progress = await onboardingService.getOnboardingProgress(restaurantId);

      return res.json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      console.error("[onboardingController] getProgress error:", error?.stack || error);

      if (error.message === "Restaurant not found") {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      return res.status(500).json({ success: false, message: "Failed to fetch onboarding progress" });
    }
  },
};

export default onboardingController;
