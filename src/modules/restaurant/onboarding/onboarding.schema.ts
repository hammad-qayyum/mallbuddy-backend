import { z } from "zod";

export const getOnboardingProgressSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
});

export type GetOnboardingProgressInput = z.infer<typeof getOnboardingProgressSchema>;

export const onboardingProgressResponseSchema = z.object({
  cuisineTypeAdded: z.boolean(),
  businessHoursAdded: z.boolean(),
  bannerImageAdded: z.boolean(),
  progress: z.number().min(0).max(100), // 0%, 33%, 66%, or 100%
  progressPercentage: z.string(), // "0%", "33%", "66%", "100%"
  completionSteps: z.array(z.string()), // Array of completed steps like ["Cuisine Type", "Business Hours", "Banner Image"]
});

export type OnboardingProgressResponse = z.infer<typeof onboardingProgressResponseSchema>;
