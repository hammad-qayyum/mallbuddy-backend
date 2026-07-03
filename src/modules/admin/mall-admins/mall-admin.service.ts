import { Request } from "express";
import prisma from "../../../config/prisma";
import { auth } from "../../../libs/betterauth";
import { expressHeadersToFetch, normalizePhoneNumber } from "../../common/utils";
import { CreateMallAdminInput } from "./mall-admin.schema";

/**
 * GAP-018 — Mall admin provisioning (Super Admin only).
 *
 * Mirrors createRestaurantService.createRestaurantByAdmin: the account is
 * created via Better Auth (password hashing, Account row), then promoted to
 * MALL_ADMIN with its managed mall in a follow-up update. On failure the
 * orphaned auth user is cleaned up best-effort.
 */
export const mallAdminService = {
  async createMallAdmin(data: CreateMallAdminInput, req?: Request) {
    // Validate mall exists
    const mall = await prisma.mall.findUnique({
      where: { id: data.mallId },
      select: { id: true, name: true },
    });

    if (!mall) {
      throw new Error(`Mall with ID "${data.mallId}" does not exist`);
    }

    const normalizedPhone = data.phoneNumber
      ? normalizePhoneNumber(data.phoneNumber)
      : undefined;

    const email = data.email.trim().toLowerCase();
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    let authUserId: string | null = null;

    try {
      // Step 1: Create the account via Better Auth (handles password hashing)
      const authResult = await auth.api.signUpEmail({
        body: {
          email,
          password: data.password,
          name: fullName,
        },
        headers: req ? expressHeadersToFetch(req) : {},
      });

      authUserId = authResult.user.id;

      if (!authUserId) {
        throw new Error("Failed to create user account");
      }

      // Step 2: Promote to MALL_ADMIN bound to the managed mall
      const user = await prisma.$transaction(async (tx) => {
        if (normalizedPhone) {
          const existingUserWithPhone = await tx.user.findUnique({
            where: { phoneNumber: normalizedPhone },
            select: { id: true },
          });
          if (existingUserWithPhone && existingUserWithPhone.id !== authUserId) {
            throw new Error("Phone number is already registered to another account");
          }
        }

        return tx.user.update({
          where: { id: authUserId! },
          data: {
            role: "MALL_ADMIN",
            managedMallId: data.mallId,
            firstName: data.firstName,
            lastName: data.lastName,
            ...(normalizedPhone && { phoneNumber: normalizedPhone }),
          },
        });
      });

      return { user, mall };
    } catch (error: any) {
      // Cleanup: delete the Better Auth user if promotion failed
      if (authUserId) {
        try {
          await prisma.user.delete({ where: { id: authUserId } });
        } catch (cleanupError) {
          console.error("Failed to cleanup orphaned mall admin user:", cleanupError);
        }
      }
      throw error;
    }
  },

  async getMallAdmins() {
    return prisma.user.findMany({
      where: { role: "MALL_ADMIN" },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        Status: true,
        createdAt: true,
        managedMallId: true,
        managedMall: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
