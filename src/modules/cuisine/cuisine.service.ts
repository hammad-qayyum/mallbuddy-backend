import prisma from "../../config/prisma";
import { CreateCuisineInput, UpdateCuisineInput } from "./cuisine.schema";
import { deleteImageFile } from "../../config/upload";

export const cuisineService = {
  // Create a new cuisine category for a specific mall
  async createCuisine(mallId: string, data: CreateCuisineInput) {
    return prisma.cuisineCategory.create({
      data: {
        mallId,
        name: data.name,
        ...(data.image !== undefined && { image: data.image }),
      },
    });
  },

  // Get all cuisine categories for a specific mall
  async getAllCuisines(mallId: string) {
    return prisma.cuisineCategory.findMany({
      where: { mallId },
      orderBy: { name: "asc" }, // alphabetical order for UX
    });
  },

  // Get a single cuisine category by its ID
  async getCuisineById(id: string) {
    return prisma.cuisineCategory.findUnique({
      where: { id },
    });
  },

  // Update a cuisine category by ID
  async updateCuisine(id: string, data: UpdateCuisineInput) {
    // Get current category to check for existing image
    const currentCategory = await prisma.cuisineCategory.findUnique({
      where: { id },
      select: { image: true },
    });

    const updateData: any = {};
    
    // Only update fields that are provided and not empty
    if (data.name !== undefined && data.name !== null && data.name.trim() !== "") {
      updateData.name = data.name;
    }
    if (data.image !== undefined && data.image !== null && data.image.trim() !== "") {
      // Delete old image if it exists and is a local file
      if (currentCategory?.image && currentCategory.image.startsWith("/uploads/")) {
        deleteImageFile(currentCategory.image);
      }
      updateData.image = data.image;
    }

    return prisma.cuisineCategory.update({
      where: { id },
      data: updateData,
    });
  },

  // Delete a cuisine category by ID
  async deleteCuisine(id: string) {
    // Get category to check for image before deletion
    const category = await prisma.cuisineCategory.findUnique({
      where: { id },
      select: { image: true },
    });

    // Delete the category
    await prisma.cuisineCategory.delete({
      where: { id },
    });

    // Delete image file if exists
    if (category?.image) {
      deleteImageFile(category.image);
    }
  },
};
