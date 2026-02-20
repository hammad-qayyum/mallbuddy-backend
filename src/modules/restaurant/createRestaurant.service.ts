import { Request } from "express";
import prisma from "../../config/prisma";
import { auth } from "../../libs/betterauth";
import { expressHeadersToFetch, normalizePhoneNumber, phoneAsAliasEmail } from "../common/utils";
import { AdminCreateRestaurantInput, RestaurantSignupInput } from "./restaurant.schema";

/**
 * Service for creating restaurant accounts (both admin and self-signup).
 * Atomically creates User(role=RESTAURANT) and Restaurant in a single transaction.
 * 
 * Rules enforced:
 * - User is created with role = RESTAURANT
 * - Restaurant is automatically created with userId as primary key
 * - Both operations are atomic (transaction)
 * - Restaurant starts with onboardingCompleted = false
 * 
 * @throws Error if mall doesn't exist (if provided)
 * @throws Error if email already exists
 * @throws Error if transaction fails (with cleanup of Better Auth user)
 */
export const createRestaurantService = {
  /**
   * Admin creates restaurant account
   */
  async createRestaurantByAdmin(
    data: AdminCreateRestaurantInput,
    req?: Request
  ) {
    // Validate mall exists if provided
    if (data.mallId) {
      const mall = await prisma.mall.findUnique({
        where: { id: data.mallId },
      });

      if (!mall) {
        throw new Error(`Mall with ID "${data.mallId}" does not exist`);
      }
    }

    // Resolve email/phone identifier
    const normalizedPhone = data.phoneNumber 
      ? normalizePhoneNumber(data.phoneNumber) 
      : undefined;
    const identifierEmail = data.email || (normalizedPhone ? phoneAsAliasEmail(normalizedPhone) : null);

    if (!identifierEmail) {
      throw new Error("Email or phone number is required");
    }

    // Generate full name
    const fullName = [data.firstName, data.lastName]
      .filter(Boolean)
      .join(" ") || data.name || "Restaurant Owner";

    let authUserId: string | null = null;

    try {
      // Step 1: Create user account via Better Auth (outside transaction)
      // Better Auth handles password hashing and account creation
      const authResult = await auth.api.signUpEmail({
        body: {
          email: identifierEmail,
          password: data.password,
          name: fullName,
        },
        headers: req ? expressHeadersToFetch(req) : {},
      });

      authUserId = authResult.user.id;

      if (!authUserId) {
        throw new Error("Failed to create user account");
      }

      // Step 2: Atomic transaction to update User role and create Restaurant
      const result = await prisma.$transaction(async (tx) => {
        // Check if phoneNumber already exists (if provided)
        if (normalizedPhone) {
          const existingUserWithPhone = await tx.user.findUnique({
            where: { phoneNumber: normalizedPhone },
            select: { id: true },
          });

          // If phoneNumber exists and belongs to a different user, throw error
          if (existingUserWithPhone && existingUserWithPhone.id !== authUserId) {
            throw new Error("Phone number is already registered to another account");
          }
        }

        // Build update data - only include phoneNumber if it doesn't conflict
        const updateData: any = {
          role: "RESTAURANT",
          firstName: data.firstName || null,
          lastName: data.lastName || null,
        };

        // Only add phoneNumber if provided and doesn't conflict
        if (normalizedPhone) {
          updateData.phoneNumber = normalizedPhone;
        }

        // Update user with role RESTAURANT and additional info
        const restaurantUser = await tx.user.update({
          where: { id: authUserId! },
          data: updateData,
        });

        // Validate: Ensure user doesn't already have a restaurant
        const existingRestaurant = await tx.restaurant.findUnique({
          where: { userId: restaurantUser.id },
        });

        if (existingRestaurant) {
          throw new Error("User already has a restaurant. This should never happen.");
        }

        // Create Restaurant atomically
        if (!data.mallId) {
          throw new Error("Mall ID is required to create a restaurant");
        }

        const restaurant = await tx.restaurant.create({
          data: {
            userId: restaurantUser.id, // Primary key
            mallId: data.mallId, // Required
            name: data.name,
            mainCategory: data.mainCategory || null,
            description: data.description,
            location: data.location,
            cuisineCategoryId: data.cuisineCategoryId || null,
            banner: data.banner || null,
            story: data.story || null,
            onboardingCompleted: false, // Start with onboarding incomplete
            ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
          },
        });

        return {
          user: restaurantUser,
          restaurant,
        };
      });

      return {
        ...result,
        session: (authResult as any).session || (authResult as any).token, // Return session/token for immediate login
      };
    } catch (error: any) {
      // Cleanup: Delete Better Auth user if transaction failed
      if (authUserId) {
        try {
          await prisma.user.delete({ where: { id: authUserId } });
          // Better Auth will cascade delete related records via Prisma adapter
        } catch (cleanupError) {
          console.error("Failed to cleanup orphaned user:", cleanupError);
        }
      }
      throw error;
    }
  },

  /**
   * Restaurant self-signup
   */
  async createRestaurantUserWithRestaurant(
    data: RestaurantSignupInput,
    req?: Request
  ) {
    // Validate mall exists if provided
    if (data.mallId) {
      const mall = await prisma.mall.findUnique({
        where: { id: data.mallId },
      });

      if (!mall) {
        throw new Error(`Mall with ID "${data.mallId}" does not exist`);
      }
    }

    // Resolve email/phone identifier
    const normalizedPhone = data.phoneNumber 
      ? normalizePhoneNumber(data.phoneNumber) 
      : undefined;
    const identifierEmail = data.email || (normalizedPhone ? phoneAsAliasEmail(normalizedPhone) : null);

    if (!identifierEmail) {
      throw new Error("Email or phone number is required");
    }

    // Generate full name
    const fullName = [data.firstName, data.lastName]
      .filter(Boolean)
      .join(" ") || data.name || "Restaurant Owner";

    let authUserId: string | null = null;

    try {
      // Step 1: Create user account via Better Auth (outside transaction)
      // Better Auth handles password hashing and account creation
      const authResult = await auth.api.signUpEmail({
        body: {
          email: identifierEmail,
          password: data.password,
          name: fullName,
        },
        headers: req ? expressHeadersToFetch(req) : {},
      });

      authUserId = authResult.user.id;

      // Step 2: Atomic transaction to update User role and create Restaurant
      const result = await prisma.$transaction(async (tx) => {
        // Check if phoneNumber already exists (if provided)
        if (normalizedPhone) {
          const existingUserWithPhone = await tx.user.findUnique({
            where: { phoneNumber: normalizedPhone },
            select: { id: true },
          });

          // If phoneNumber exists and belongs to a different user, throw error
          if (existingUserWithPhone && existingUserWithPhone.id !== authUserId) {
            throw new Error("Phone number is already registered to another account");
          }
        }

        // Build update data - only include phoneNumber if it doesn't conflict
        const updateData: any = {
          role: "RESTAURANT",
          firstName: data.firstName || null,
          lastName: data.lastName || null,
        };

        // Only add phoneNumber if provided and doesn't conflict
        if (normalizedPhone) {
          updateData.phoneNumber = normalizedPhone;
        }

        // Update user with role RESTAURANT and additional info
        const restaurantUser = await tx.user.update({
          where: { id: authUserId! },
          data: updateData,
        });

        // Validate: Ensure user doesn't already have a restaurant
        const existingRestaurant = await tx.restaurant.findUnique({
          where: { userId: restaurantUser.id },
        });

        if (existingRestaurant) {
          throw new Error("User already has a restaurant. This should never happen.");
        }

        // Create Restaurant atomically
        if (!data.mallId) {
          throw new Error("Mall ID is required to create a restaurant");
        }

        const restaurant = await tx.restaurant.create({
          data: {
            userId: restaurantUser.id, // Primary key
            mallId: data.mallId, // Required
            name: data.name,
            mainCategory: data.mainCategory || null,
            description: data.description,
            location: data.location,
            cuisineCategoryId: data.cuisineCategoryId || null,
            onboardingCompleted: false, // Start with onboarding incomplete
          },
        });

        return {
          user: restaurantUser,
          restaurant,
        };
      });

      return {
        ...result,
        session: (authResult as any).session || (authResult as any).token, // Return session/token for immediate login
      };
    } catch (error: any) {
      // Cleanup: Delete Better Auth user if transaction failed
      if (authUserId) {
        try {
          await prisma.user.delete({ where: { id: authUserId } });
          // Better Auth will cascade delete related records via Prisma adapter
        } catch (cleanupError) {
          console.error("Failed to cleanup orphaned user:", cleanupError);
        }
      }
      throw error;
    }
  },
};

