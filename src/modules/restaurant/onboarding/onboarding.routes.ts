import { Router } from "express";
import onboardingController from "./onboarding.controller";

const router = Router();

/**
 * @swagger
 * /components/schemas/OnboardingProgress:
 *   type: object
 *   description: Restaurant onboarding progress details showing completion status of required steps
 *   properties:
 *     cuisineTypeAdded:
 *       type: boolean
 *       description: Whether the restaurant has selected a cuisine type (contributes 33% to progress)
 *       example: true
 *     businessHoursAdded:
 *       type: boolean
 *       description: Whether the restaurant has added business hours for at least one day (contributes 66% to progress)
 *       example: true
 *     bannerImageAdded:
 *       type: boolean
 *       description: Whether the restaurant has uploaded banner images (contributes 100% to progress)
 *       example: false
 *     progress:
 *       type: number
 *       description: |
 *         Onboarding completion percentage based on steps completed:
 *         - **0%** - No onboarding steps completed
 *         - **33%** - Only cuisine type has been selected
 *         - **66%** - Cuisine type AND business hours have been added
 *         - **100%** - All steps completed (cuisine type, business hours, and banner images)
 *       enum: [0, 33, 66, 100]
 *       example: 66
 *     progressPercentage:
 *       type: string
 *       description: Progress percentage formatted as a string with the % symbol
 *       pattern: '^\d+%$'
 *       example: "66%"
 *     completionSteps:
 *       type: array
 *       items:
 *         type: string
 *         enum: ["Cuisine Type", "Business Hours", "Banner Image"]
 *       description: Array listing which onboarding steps have been completed in order
 *       example: ["Cuisine Type", "Business Hours"]
 *   required:
 *     - cuisineTypeAdded
 *     - businessHoursAdded
 *     - bannerImageAdded
 *     - progress
 *     - progressPercentage
 *     - completionSteps
 */

/**
 * @swagger
 * /restaurant/{restaurantId}/onboardingprogress:
 *   get:
 *     summary: Get restaurant onboarding progress
 *     operationId: getOnboardingProgress
 *     tags: [Onboarding]
 *     description: |
 *       Retrieve the restaurant's onboarding completion status and checklist progress.
 *       
 *       ## Progress Calculation
 *       Progress is calculated based on completing the following setup steps:
 *       1. **Cuisine Type (33%)** - Restaurant owner has selected a cuisine category
 *       2. **Business Hours (66%)** - Restaurant owner has configured operating hours for at least one day
 *       3. **Banner Image (100%)** - Restaurant has uploaded banner images for the storefront
 *       
 *       Each step must be completed in order to unlock the next milestone.
 *       
 *       ## Access Control
 *       This is a **public endpoint** - no authentication is required. Both customers and unauthenticated users can check a restaurant's onboarding status.
 *       
 *       ## Use Cases
 *       - Display onboarding checklist completion in the restaurant owner dashboard
 *       - Show setup progress to guide new restaurant owners
 *       - Determine when a restaurant is ready to go live
 *       - Track restaurant readiness metrics
 *     
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           The unique identifier of the restaurant (same value as the restaurant owner's user ID).
 *           Accepts your system-generated string ID (not limited to UUID/GUID format).
 *         example: "3cGftA4U57LM7KcjUvisIsiwfZzZFV7l"
 *     
 *     responses:
 *       200:
 *         description: |
 *           Onboarding progress retrieved successfully. Returns an object containing the completion status
 *           of each onboarding requirement and an overall progress percentage.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates whether the request was successful
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/OnboardingProgress'
 *             examples:
 *               notStarted:
 *                 summary: Restaurant has not started onboarding (0%)
 *                 description: Restaurant has not completed any onboarding steps yet
 *                 value:
 *                   success: true
 *                   data:
 *                     cuisineTypeAdded: false
 *                     businessHoursAdded: false
 *                     bannerImageAdded: false
 *                     progress: 0
 *                     progressPercentage: "0%"
 *                     completionSteps: []
 *               partialCompletion:
 *                 summary: Cuisine type and business hours completed (66%)
 *                 description: Restaurant owner has selected cuisine and configured business hours, but hasn't uploaded banner images
 *                 value:
 *                   success: true
 *                   data:
 *                     cuisineTypeAdded: true
 *                     businessHoursAdded: true
 *                     bannerImageAdded: false
 *                     progress: 66
 *                     progressPercentage: "66%"
 *                     completionSteps: ["Cuisine Type", "Business Hours"]
 *               fullyCompleted:
 *                 summary: All onboarding steps completed (100%)
 *                 description: Restaurant has completed all onboarding requirements and is ready to go live
 *                 value:
 *                   success: true
 *                   data:
 *                     cuisineTypeAdded: true
 *                     businessHoursAdded: true
 *                     bannerImageAdded: true
 *                     progress: 100
 *                     progressPercentage: "100%"
 *                     completionSteps: ["Cuisine Type", "Business Hours", "Banner Image"]
 *       400:
 *         description: |
 *           Bad Request - The request is missing the required restaurant ID parameter
 *           or has an invalid format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   description: Error message describing what's missing or invalid
 *                   example: "Restaurant ID is required"
 *             examples:
 *               missingId:
 *                 summary: Missing restaurant ID
 *                 value:
 *                   success: false
 *                   message: "Restaurant ID is required"
 *       404:
 *         description: |
 *           Not Found - The specified restaurant ID does not exist in the database.
 *           This could mean the restaurant has been deleted or the ID is incorrect.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   description: Error message indicating the restaurant was not found
 *                   example: "Restaurant not found"
 *       500:
 *         description: |
 *           Internal Server Error - An unexpected error occurred while processing the request.
 *           This could be a database connection issue or other server-side problem.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   description: Generic error message
 *                   example: "Failed to fetch onboarding progress"
 */
router.get("/restaurant/:restaurantId/onboardingprogress", onboardingController.getProgress);

export default router;
