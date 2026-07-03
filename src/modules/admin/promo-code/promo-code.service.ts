
import prisma from "../../../config/prisma";
import { CreatePromoCodeRequest, UpdatePromoCodeRequest } from "./promo-code.schema";

// GAP-018 — mall scoping. `scopeMallId` is null/undefined for the global
// super admin (unscoped) and the managed mall id for MALL_ADMIN. Cross-mall
// object access throws "Promo code not found" (mapped to 404) so probing
// doesn't disclose existence.
export const adminPromoCodeService = {
  /**
   * Admin: Create new promo code
   * startDate is automatically set to current timestamp
   * endDate must be provided from frontend calendar picker
   */
  async createPromoCode(data: CreatePromoCodeRequest, scopeMallId?: string | null) {
    // Mall admins can only create codes for their own mall.
    const mallId = scopeMallId ?? data.mallId;
    if (scopeMallId && data.mallId && data.mallId !== scopeMallId) {
      throw new Error("Cannot create a promo code for another mall");
    }

    // Integrity check for every admin: the target restaurant must belong to
    // the promo code's mall.
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: data.restaurantId },
      select: { mallId: true },
    });
    if (!restaurant || restaurant.mallId !== mallId) {
      throw new Error("Restaurant does not belong to the selected mall");
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        mallId,
        restaurantId: data.restaurantId,
        code: data.code.toUpperCase(),
        discountPercentage: data.discountPercentage,
        startDate: new Date(), // Auto-generated: current timestamp
        endDate: new Date(data.endDate), // From frontend calendar
      },
    });

    return promoCode;
  },

  /**
   * Admin: Get all promo codes
   */
  async getAllPromoCodes(scopeMallId?: string | null) {
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        ...(scopeMallId && { mallId: scopeMallId }),
      },
      include: {
        mall: {
          select: {
            id: true,
            name: true,
          },
        },
        Restaurant: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return promoCodes;
  },

  /**
   * Admin: Get promo code by ID
   */
  async getPromoCodeById(id: string, scopeMallId?: string | null) {
    const promoCode = await prisma.promoCode.findUnique({
      where: { id },
      include: {
        mall: {
          select: {
            id: true,
            name: true,
          },
        },
        Restaurant: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    });

    if (promoCode && scopeMallId && promoCode.mallId !== scopeMallId) {
      return null; // treat cross-mall access as not found
    }

    return promoCode;
  },

  /**
   * Admin: Update promo code
   */
  async updatePromoCode(id: string, data: UpdatePromoCodeRequest, scopeMallId?: string | null) {
    if (scopeMallId) {
      const existing = await prisma.promoCode.findUnique({
        where: { id },
        select: { mallId: true },
      });
      if (!existing || existing.mallId !== scopeMallId) {
        throw new Error("Promo code not found");
      }
      if (data.mallId && data.mallId !== scopeMallId) {
        throw new Error("Cannot move a promo code to another mall");
      }
    }

    const updateData: any = {};

    if (data.mallId) updateData.mallId = data.mallId;
    if (data.restaurantId) updateData.restaurantId = data.restaurantId;
    if (data.code) updateData.code = data.code.toUpperCase();
    if (data.discountPercentage !== undefined) updateData.discountPercentage = data.discountPercentage;
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    // Keep the restaurant↔mall pairing consistent when either changes.
    if (updateData.restaurantId) {
      const targetMallId = updateData.mallId
        ?? (await prisma.promoCode.findUnique({ where: { id }, select: { mallId: true } }))?.mallId;
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: updateData.restaurantId },
        select: { mallId: true },
      });
      if (!restaurant || restaurant.mallId !== targetMallId) {
        throw new Error("Restaurant does not belong to the promo code's mall");
      }
    }

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data: updateData,
    });

    return promoCode;
  },

  /**
   * Admin: Delete promo code
   */
  async deletePromoCode(id: string, scopeMallId?: string | null) {
    if (scopeMallId) {
      const existing = await prisma.promoCode.findUnique({
        where: { id },
        select: { mallId: true },
      });
      if (!existing || existing.mallId !== scopeMallId) {
        throw new Error("Promo code not found");
      }
    }

    await prisma.promoCode.delete({
      where: { id },
    });

    return { success: true, message: "Promo code deleted successfully" };
  },

  /**
   * Admin: Get valid (non-expired) promo codes for a specific restaurant
   */
  async getValidPromoCodesByRestaurant(restaurantId: string, scopeMallId?: string | null) {
    if (scopeMallId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: restaurantId },
        select: { mallId: true },
      });
      if (!restaurant || restaurant.mallId !== scopeMallId) {
        throw new Error("Restaurant not found");
      }
    }

    const now = new Date();
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        restaurantId: restaurantId,
        endDate: {
          gte: now, // Not expired
        },
        startDate: {
          lte: now, // Already started
        },
      },
      include: {
        mall: {
          select: {
            id: true,
            name: true,
          },
        },
        Restaurant: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
      orderBy: {
        endDate: "desc",
      },
    });

    return promoCodes;
  },

  /**
   * Admin: Search promo codes by code name
   */
  async searchPromoCodes(searchTerm: string, scopeMallId?: string | null) {
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        code: {
          contains: searchTerm,
          mode: 'insensitive',
        },
        ...(scopeMallId && { mallId: scopeMallId }),
      },
      include: {
        mall: {
          select: {
            id: true,
            name: true,
          },
        },
        Restaurant: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return promoCodes;
  },
};
