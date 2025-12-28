import prisma from "../../../config/prisma";
import {
  CreatePromotionInput,
  UpdatePromotionInput,
} from "./promotion.schema";
import { deleteImageFile } from "../../../config/upload";

export const promotionService = {
  /**
   * Create a new promotion for a restaurant
   */
  async createPromotion(data: CreatePromotionInput) {
    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: data.restaurantId },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    return prisma.promotion.create({
      data: {
        restaurantId: data.restaurantId,
        title: data.title,
        banner: data.banner || "",
        discountPercentage: data.discountPercentage,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
      },
    });
  },

  /**
   * Get all promotions for a restaurant
   */
  async getPromotionsByRestaurant(restaurantId: string) {
    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    return prisma.promotion.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Get a single promotion by ID
   */
  async getPromotionById(id: string) {
    return prisma.promotion.findUnique({
      where: { id },
    });
  },

  /**
   * Update a promotion
   */
  async updatePromotion(id: string, data: UpdatePromotionInput) {
    // Get current promotion to check for existing banner
    const currentPromotion = await prisma.promotion.findUnique({
      where: { id },
      select: { banner: true },
    });

    if (!currentPromotion) {
      throw new Error("Promotion not found");
    }

    const updateData: any = {};

    // Only update fields that are provided and not empty
    if (data.title !== undefined && data.title !== null && data.title.trim() !== "") {
      updateData.title = data.title;
    }
    if (data.discountPercentage !== undefined && data.discountPercentage !== null) {
      updateData.discountPercentage = data.discountPercentage;
    }
    if (data.startDate !== undefined && data.startDate !== null) {
      updateData.startDate = data.startDate;
    }
    if (data.endDate !== undefined && data.endDate !== null) {
      updateData.endDate = data.endDate;
    }
    if (data.isActive !== undefined && data.isActive !== null) {
      updateData.isActive = data.isActive;
    }
    
    if (data.banner !== undefined && data.banner !== null && data.banner.trim() !== "") {
      // Delete old banner if it exists and is a local file
      if (currentPromotion.banner && currentPromotion.banner.startsWith("/uploads/")) {
        deleteImageFile(currentPromotion.banner);
      }
      updateData.banner = data.banner;
    }

    return prisma.promotion.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * Delete a promotion
   */
  async deletePromotion(id: string) {
    // Get promotion to check for banner before deletion
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      select: { banner: true },
    });

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    // Delete the promotion
    await prisma.promotion.delete({
      where: { id },
    });

    // Delete banner file if exists
    if (promotion.banner) {
      deleteImageFile(promotion.banner);
    }
  },

  /**
   * Get active promotions for a restaurant
   */
  async getActivePromotions(restaurantId: string) {
    // Get current date - use local time to match how dates are stored
    const now = new Date();
    
    // Get start of today in local time (00:00:00 local)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get end of today in local time (23:59:59.999 local)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const promotions = await prisma.promotion.findMany({
      where: {
        restaurantId,
        isActive: true,
        startDate: { lte: todayEnd }, // Promotion has started (by end of today)
        endDate: { gte: todayStart }, // Promotion hasn't ended (by start of today)
      },
      orderBy: { createdAt: "desc" },
    });
    
    return promotions;
  },
};

