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
    const malls = await prisma.mall.findMany({
      ...(cityId && { where: { cityId } }),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        cityId: true,
        _count: {
          select: {
            restaurants: true,
          },
        },
      },
    });

    // Return exact restaurant count
    return malls.map((mall) => {
      return {
        id: mall.id,
        name: mall.name,
        address: mall.address,
        cityId: mall.cityId,
        restaurantCount: mall._count.restaurants,
      };
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

  // Get statistics per mall: total revenue, orders, restaurants per mall
  async getMallStatistics(page: number = 1, limit: number = 10) {
    // Get total count of malls for pagination
    const totalMalls = await prisma.mall.count();

    // Get paginated malls
    const malls = await prisma.mall.findMany({
      include: {
        restaurants: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get all orders with restaurant and mall info
    const orders = await prisma.order.findMany({
      include: {
        restaurant: {
          select: {
            mallId: true,
          },
        },
      },
    });

    // Calculate statistics per mall
    const mallStats = malls.map((mall) => {
      // Filter orders for this mall
      const mallOrders = orders.filter(
        (order) => order.restaurant.mallId === mall.id
      );

      // Calculate total revenue for this mall
      const totalRevenue = mallOrders.reduce((sum, order) => {
        return sum + Number.parseFloat(order.total.toString());
      }, 0);

      // Calculate total orders for this mall
      const totalOrders = mallOrders.length;

      // Get restaurant count for this mall
      const totalRestaurants = mall.restaurants.length;

      // Calculate revenue by status for this mall
      const revenueByStatus = mallOrders.reduce((acc, order) => {
        const status = order.status;
        const orderTotal = Number.parseFloat(order.total.toString());
        if (!acc[status]) {
          acc[status] = 0;
        }
        acc[status] += orderTotal;
        return acc;
      }, {} as Record<string, number>);

      // Calculate orders by status for this mall
      const ordersByStatus = mallOrders.reduce((acc, order) => {
        const status = order.status;
        if (!acc[status]) {
          acc[status] = 0;
        }
        acc[status] += 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        mall: {
          id: mall.id,
          name: mall.name,
          address: mall.address,
          cityId: mall.cityId,
        },
        statistics: {
          totalRestaurants,
          totalOrders,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          revenueByStatus,
          ordersByStatus,
        },
      };
    });

    return {
      data: mallStats,
      pagination: {
        page,
        limit,
        total: totalMalls,
        totalPages: Math.ceil(totalMalls / limit),
      },
    };
  },
};
