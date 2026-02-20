import prisma from "../../../config/prisma";
import {
  CreateCityInput,
  UpdateCityInput,
} from "./city.schema";

export const cityService = {
  // Create city
  async createCity(data: CreateCityInput) {
    return prisma.city.create({
      data: {
        name: data.name,
        countryId: data.countryId,
      },
    });
  },

  // Get all cities OR cities of a specific country
  async getCities(countryId?: string) {
    return prisma.city.findMany({
      ...(countryId && { where: { countryId } }),
      orderBy: { name: "asc" },
    });
  },

  // Get by ID
  async getCityById(id: string) {
    return prisma.city.findUnique({
      where: { id },
    });
  },

  // Update
  async updateCity(id: string, data: UpdateCityInput) {
    return prisma.city.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.countryId !== undefined && { countryId: data.countryId }),
      },
    });
  },

  // Delete
  async deleteCity(id: string) {
    return prisma.city.delete({
      where: { id },
    });
  },
};
