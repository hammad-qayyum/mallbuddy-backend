import prisma from "../../config/prisma";
import { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.schema";
import { deleteImageFile } from "../../config/upload";

export const restaurantService = {
  // Create a new restaurant in DB
  async createRestaurant(data: CreateRestaurantInput) {
    return prisma.restaurant.create({
      data: {
        userId: data.userId,
        mallId: data.mallId,
        mainCategory: data.mainCategory,
        ...(data.banner !== undefined && { banner: data.banner }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
      },
    });
  },

  // Get all restaurants for a mall, with optional category filter & pagination
  async getAllRestaurants(
    mallId: string,
    category?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const where: any = { mallId };
    if (category) where.mainCategory = category;

    const total = await prisma.restaurant.count({ where });

    const data = await prisma.restaurant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { user: true }, // include user info: name, profilePic
    });

    return { data, total, page, limit };
  },

  // Get restaurant details + user info + menu categories + menu items
  async getRestaurantDetails(restaurantId: string) {
    return prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      include: {
        user: true, // fetch restaurant name + profilePic
        menuCategories: { include: { items: true } }, // nested menu categories + items
      },
    });
  },

  // Update restaurant by ID
  async updateRestaurant(id: string, data: UpdateRestaurantInput) {
    // Get current restaurant to check for existing banner
    const currentRestaurant = await prisma.restaurant.findUnique({
      where: { userId: id },
      select: { banner: true },
    });

    const updateData: any = {};
    
    if (data.mallId !== undefined) updateData.mallId = data.mallId;
    if (data.mainCategory !== undefined) updateData.mainCategory = data.mainCategory;
    if (data.banner !== undefined) {
      // Delete old banner if it exists and is a local file
      if (currentRestaurant?.banner && currentRestaurant.banner.startsWith("/uploads/")) {
        deleteImageFile(currentRestaurant.banner);
      }
      updateData.banner = data.banner;
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    
    return prisma.restaurant.update({
      where: { userId: id },
      data: updateData,
    });
  },

  // Delete restaurant by ID
  async deleteRestaurant(id: string) {
    // Get restaurant to check for banner before deletion
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: id },
      select: { banner: true },
    });

    // Delete the restaurant
    await prisma.restaurant.delete({
      where: { userId: id },
    });

    // Delete banner file if exists
    if (restaurant?.banner) {
      deleteImageFile(restaurant.banner);
    }
  },
};
