import prisma from "../../config/prisma";
import {
  CreateMenuCategoryInput,
  UpdateMenuCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "./menu.schema";
import { deleteImageFile } from "../../config/upload";

export const menuCategoryService = {
  // Menu Categories CRUD
  async createCategory(data: CreateMenuCategoryInput) {
    return prisma.menuCategory.create({ data });
  },

  async getCategoriesByRestaurant(restaurantId: string) {
    return prisma.menuCategory.findMany({
      where: { restaurantId },
      include: { items: true }, // include all menu items under this category
      orderBy: { name: "asc" },
    });
  },

  async getCategoryById(id: string) {
    return prisma.menuCategory.findUnique({ where: { id }, include: { items: true } });
  },

  async updateCategory(id: string, data: UpdateMenuCategoryInput) {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    
    return prisma.menuCategory.update({ where: { id }, data: updateData });
  },

  async deleteCategory(id: string) {
    return prisma.menuCategory.delete({ where: { id } });
  },

  // Menu Items CRUD
  async createItem(data: CreateMenuItemInput) {
    return prisma.menuItem.create({
      data: {
        categoryId: data.menuCategoryId, // Map menuCategoryId to categoryId
        name: data.name,
        price: data.price,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.preparationTime !== undefined && { preparationTime: data.preparationTime }),
        ...(data.image !== undefined && { image: data.image }),
      },
    });
  },

  async getItemById(id: string) {
    return prisma.menuItem.findUnique({ where: { id } });
  },

  async updateItem(id: string, data: UpdateMenuItemInput) {
    // Get current item to check for existing image
    const currentItem = await prisma.menuItem.findUnique({
      where: { id },
      select: { image: true },
    });

    const updateData: any = {};
    
    // Only update fields that are provided and not empty
    if (data.name !== undefined && data.name !== null && data.name.trim() !== "") {
      updateData.name = data.name;
    }
    if (data.price !== undefined && data.price !== null && data.price >= 0) {
      updateData.price = data.price;
    }
    if (data.description !== undefined && data.description !== null && data.description.trim() !== "") {
      updateData.description = data.description;
    }
    if (data.preparationTime !== undefined && data.preparationTime !== null && data.preparationTime.trim() !== "") {
      updateData.preparationTime = data.preparationTime;
    }
    if (data.image !== undefined && data.image !== null && data.image.trim() !== "") {
      // Delete old image if it exists and is a local file
      if (currentItem?.image && currentItem.image.startsWith("/uploads/")) {
        deleteImageFile(currentItem.image);
      }
      updateData.image = data.image;
    }
    
    return prisma.menuItem.update({ where: { id }, data: updateData });
  },

  async deleteItem(id: string) {
    // Get item to check for image before deletion
    const item = await prisma.menuItem.findUnique({
      where: { id },
      select: { image: true },
    });

    // Delete the item
    await prisma.menuItem.delete({
      where: { id },
    });

    // Delete image file if exists
    if (item?.image) {
      deleteImageFile(item.image);
    }
  },
};
