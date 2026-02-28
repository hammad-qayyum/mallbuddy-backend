import prisma from "../../../config/prisma";
import { OnboardingProgressResponse } from "./onboarding.schema";

export const onboardingService = {
  /**
   * Get restaurant onboarding progress
   * Checks if restaurant has:
   * 1. Cuisine type selected (33%)
   * 2. Business hours added (66%)
   * 3. Banner image added (100%)
   */
  async getOnboardingProgress(restaurantId: string): Promise<OnboardingProgressResponse> {
    try {
      // Fetch restaurant with required relations
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: restaurantId },
        select: {
          cuisineCategoryId: true,
          banner: true,
          businessDays: {
            select: {
              id: true,
            },
          },
          gallery: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!restaurant) {
        throw new Error("Restaurant not found");
      }

      // Check each onboarding step
      const cuisineTypeAdded = restaurant.cuisineCategoryId !== null;
      const businessHoursAdded = (restaurant.businessDays?.length ?? 0) > 0;
      const bannerImageAdded = (restaurant.gallery?.length ?? 0) > 0 || restaurant.banner !== null;

      // Calculate progress percentage (sequential - each step requires previous steps)
      let progress = 0;
      const completionSteps: string[] = [];

      // Step 1: Cuisine Type (33%)
      if (cuisineTypeAdded) {
        progress = 33;
        completionSteps.push("Cuisine Type");
        
        // Step 2: Business Hours (66%) - only counts if cuisine type is also done
        if (businessHoursAdded) {
          progress = 66;
          completionSteps.push("Business Hours");
          
          // Step 3: Banner Image (100%) - only counts if both previous steps are done
          if (bannerImageAdded) {
            progress = 100;
            completionSteps.push("Banner Image");
          }
        }
      }

      return {
        cuisineTypeAdded,
        businessHoursAdded,
        bannerImageAdded,
        progress,
        progressPercentage: `${progress}%`,
        completionSteps,
      };
    } catch (err) {
      console.error(
        "[onboardingService] getOnboardingProgress error:",
        (err as any)?.stack || err,
        { restaurantId }
      );
      throw err;
    }
  },
};

export default onboardingService;
