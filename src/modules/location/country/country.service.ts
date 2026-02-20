import prisma from "../../../config/prisma";
import {
  CreateCountryInput,
  UpdateCountryInput,
} from "./country.schema";

export const countryService = {
  // Create a new country row in the database
  async createCountry(data: CreateCountryInput) {
    return prisma.country.create({
      data: {
        name: data.name,
      },
    });
  },

  // Get all countries (used for dropdown in onboarding)
  async getAllCountries() {
    return prisma.country.findMany({
      orderBy: { name: "asc" }, // sort alphabetically for better UX
    });
  },

  // Get a single country by its ID
  async getCountryById(id: string) {
    return prisma.country.findUnique({
      where: { id },
    });
  },

  // Update a country by ID
  async updateCountry(id: string, data: UpdateCountryInput) {
    return prisma.country.update({
      where: { id },
      data: {
        // Only update fields that are present
        ...(data.name !== undefined && { name: data.name }),
      },
    });
  },

  // Delete a country by ID
  async deleteCountry(id: string) {
    return prisma.country.delete({
      where: { id },
    });
  },
};
