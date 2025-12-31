
import prisma from "../../../config/prisma";
import { CreatePromoCodeRequest, UpdatePromoCodeRequest } from "./promo-code.schema";

export const adminPromoCodeService = {
  /**
   * Admin: Create new promo code
   * startDate is automatically set to current timestamp
   * endDate must be provided from frontend calendar picker
   */
  async createPromoCode(data: CreatePromoCodeRequest) {
    const promoCode = await prisma.promoCode.create({
      data: {
        mallId: data.mallId,
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
  async getAllPromoCodes() {
    const promoCodes = await prisma.promoCode.findMany({
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
  async getPromoCodeById(id: string) {
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

    return promoCode;
  },

  /**
   * Admin: Update promo code
   */
  async updatePromoCode(id: string, data: UpdatePromoCodeRequest) {
    const updateData: any = {};

    if (data.mallId) updateData.mallId = data.mallId;
    if (data.restaurantId) updateData.restaurantId = data.restaurantId;
    if (data.code) updateData.code = data.code.toUpperCase();
    if (data.discountPercentage !== undefined) updateData.discountPercentage = data.discountPercentage;
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const promoCode = await prisma.promoCode.update({
      where: { id },
      data: updateData,
    });

    return promoCode;
  },

  /**
   * Admin: Delete promo code
   */
  async deletePromoCode(id: string) {
    await prisma.promoCode.delete({
      where: { id },
    });

    return { success: true, message: "Promo code deleted successfully" };
  },

  /**
   * Admin: Get valid (non-expired) promo codes for a specific restaurant
   */
  async getValidPromoCodesByRestaurant(restaurantId: string) {
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
  async searchPromoCodes(searchTerm: string) {
    const promoCodes = await prisma.promoCode.findMany({
      where: {
        code: {
          contains: searchTerm,
          mode: 'insensitive',
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
        createdAt: "desc",
      },
    });

    return promoCodes;
  },
};
