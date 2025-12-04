import prisma from "../../../config/prisma";
import {
  CreateMallInput,
  UpdateMallInput,
} from "./mall.schema";
import { getMallImageUrl, deleteImageFile } from "../../../config/upload";

export const mallService = {
  // Create a new mall
  async createMall(data: CreateMallInput) {
    // Validate that the city exists
    const city = await prisma.city.findUnique({
      where: { id: data.cityId },
    });

    if (!city) {
      throw new Error(`City with ID "${data.cityId}" does not exist`);
    }

    return prisma.mall.create({
      data: {
        name: data.name,
        ...(data.address !== undefined && { address: data.address }),
        cityId: data.cityId,
      },
    });
  },

  // Get all malls, optionally filtered by cityId
  async getMalls(cityId?: string) {
    return prisma.mall.findMany({
      ...(cityId && { where: { cityId } }),
      orderBy: { name: "asc" },
    });
  },

  // Get a single mall by ID
  async getMallById(id: string) {
    return prisma.mall.findUnique({
      where: { id },
    });
  },

  // Update a mall by ID
  async updateMall(id: string, data: UpdateMallInput) {
    // If cityId is being updated, validate that the city exists
    if (data.cityId !== undefined) {
      const city = await prisma.city.findUnique({
        where: { id: data.cityId },
      });

      if (!city) {
        throw new Error(`City with ID "${data.cityId}" does not exist`);
      }
    }

    return prisma.mall.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
      },
    });
  },

  // Delete a mall by ID
  async deleteMall(id: string) {
    return prisma.mall.delete({
      where: { id },
    });
  },
};
