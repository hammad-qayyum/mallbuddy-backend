import prisma from "../../config/prisma";
import {
  GetMallAnalyticsInput,
  GetRestaurantSalesSummaryInput,
  GetPromoCodeDetailsInput,
  GetPromoCodeUsageOverTimeInput,
  GetPromoCodeOrdersInput,
} from "./analytics.schema";

export const analyticsService = {
  /**
   * Get overall statistics: total customers, total restaurants, total revenue
   */
  async getOverallStatistics() {
    // Get total customers (users with role USER)
    const totalCustomers = await prisma.user.count({
      where: { role: "USER" },
    });

    // Get total restaurants
    const totalRestaurants = await prisma.restaurant.count();

    // Get all orders and calculate total revenue
    const orders = await prisma.order.findMany({
      select: {
        total: true,
        status: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);

    // Get total orders count
    const totalOrders = orders.length;

    // Calculate revenue by status
    const revenueByStatus = orders.reduce((acc, order) => {
      const status = order.status;
      const orderTotal = Number.parseFloat(order.total.toString());
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += orderTotal;
      return acc;
    }, {} as Record<string, number>);

    // Calculate orders by status
    const ordersByStatus = orders.reduce((acc, order) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCustomers,
      totalRestaurants,
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueByStatus,
      ordersByStatus,
    };
  },

  /**
   * Get mall analytics with time period filtering and trends
   */
  async getMallAnalytics(input: GetMallAnalyticsInput) {
    // Verify mall exists
    const mall = await prisma.mall.findUnique({
      where: { id: input.mallId },
      select: { id: true, name: true, address: true, cityId: true },
    });

    if (!mall) {
      throw new Error("Mall not found");
    }

    // Calculate date range based on period
    let periodStart: Date;
    let periodEnd: Date = new Date();
    const now = new Date();

    if (input.startDate && input.endDate) {
      periodStart = new Date(input.startDate);
      periodEnd = new Date(input.endDate);
    } else {
      switch (input.period || "all") {
        case "today":
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          periodEnd = new Date();
          break;
        case "week":
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case "month":
          periodStart = new Date(now);
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case "year":
          periodStart = new Date(now);
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
        default: // "all"
          periodStart = new Date(0);
          periodEnd = new Date();
          break;
      }
    }

    // Get orders for this mall in the period
    const orders = await prisma.order.findMany({
      where: {
        restaurant: {
          mallId: input.mallId,
        },
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });

    // Get restaurants count for this mall
    const totalRestaurants = await prisma.restaurant.count({
      where: { mallId: input.mallId },
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);

    // Calculate previous period for comparison
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date = periodStart;

    if (input.startDate && input.endDate) {
      const periodDuration = new Date(input.endDate).getTime() - new Date(input.startDate).getTime();
      previousPeriodEnd = new Date(input.startDate);
      previousPeriodStart = new Date(new Date(input.startDate).getTime() - periodDuration);
    } else {
      switch (input.period || "all") {
        case "today":
          previousPeriodStart = new Date(now);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
          previousPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodEnd = new Date(previousPeriodStart);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case "week":
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
          previousPeriodEnd = periodStart;
          break;
        case "month":
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
          previousPeriodEnd = periodStart;
          break;
        case "year":
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
          previousPeriodEnd = periodStart;
          break;
        default:
          previousPeriodStart = new Date(0);
          previousPeriodEnd = periodStart;
          break;
      }
    }

    // Get previous period orders for comparison
    const previousOrders = await prisma.order.findMany({
      where: {
        restaurant: {
          mallId: input.mallId,
        },
        createdAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
      select: {
        total: true,
      },
    });

    const previousRevenue = previousOrders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);
    const previousOrdersCount = previousOrders.length;

    // Calculate trends
    const revenueTrend =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;

    const ordersTrend =
      previousOrdersCount > 0
        ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100
        : totalOrders > 0
        ? 100
        : 0;

    return {
      mall: {
        id: mall.id,
        name: mall.name,
        address: mall.address,
        cityId: mall.cityId,
      },
      period: {
        type: input.period || "all",
        startDate: periodStart,
        endDate: periodEnd,
      },
      statistics: {
        totalRestaurants,
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
      },
      trends: {
        revenue: {
          current: Number(totalRevenue.toFixed(2)),
          previous: Number(previousRevenue.toFixed(2)),
          change: Number(revenueTrend.toFixed(2)),
          direction: revenueTrend > 0 ? "up" : revenueTrend < 0 ? "down" : "neutral",
        },
        orders: {
          current: totalOrders,
          previous: previousOrdersCount,
          change: Number(ordersTrend.toFixed(2)),
          direction: ordersTrend > 0 ? "up" : ordersTrend < 0 ? "down" : "neutral",
        },
      },
    };
  },

  /**
   * Get restaurant sales summary with time period filtering and trends
   */
  async getRestaurantSalesSummary(input: GetRestaurantSalesSummaryInput) {
    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: input.restaurantId },
      select: { userId: true, name: true, mallId: true },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Calculate date range based on period
    let periodStart: Date;
    let periodEnd: Date = new Date();
    const now = new Date();

    if (input.startDate && input.endDate) {
      periodStart = new Date(input.startDate);
      periodEnd = new Date(input.endDate);
    } else {
      switch (input.period || "all") {
        case "today":
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          periodEnd = new Date();
          break;
        case "week":
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case "month":
          periodStart = new Date(now);
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case "year":
          periodStart = new Date(now);
          periodStart.setFullYear(periodStart.getFullYear() - 1);
          break;
        default: // "all"
          periodStart = new Date(0);
          periodEnd = new Date();
          break;
      }
    }

    // Get orders for this restaurant in the period
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: input.restaurantId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discount: true,
        tax: true,
        deliveryFee: true,
        status: true,
        createdAt: true,
      },
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);
    const totalSubtotal = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.subtotal.toString());
    }, 0);
    const totalDiscount = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.discount.toString());
    }, 0);
    const totalTax = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.tax.toString());
    }, 0);
    const totalDeliveryFee = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.deliveryFee.toString());
    }, 0);

    // Calculate previous period for comparison
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date = periodStart;

    if (input.startDate && input.endDate) {
      const periodDuration = new Date(input.endDate).getTime() - new Date(input.startDate).getTime();
      previousPeriodEnd = new Date(input.startDate);
      previousPeriodStart = new Date(new Date(input.startDate).getTime() - periodDuration);
    } else {
      switch (input.period || "all") {
        case "today":
          previousPeriodStart = new Date(now);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
          previousPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodEnd = new Date(previousPeriodStart);
          previousPeriodEnd.setHours(23, 59, 59, 999);
          break;
        case "week":
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
          previousPeriodEnd = periodStart;
          break;
        case "month":
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
          previousPeriodEnd = periodStart;
          break;
        case "year":
          previousPeriodStart = new Date(periodStart);
          previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
          previousPeriodEnd = periodStart;
          break;
        default:
          previousPeriodStart = new Date(0);
          previousPeriodEnd = periodStart;
          break;
      }
    }

    // Get previous period orders for comparison
    const previousOrders = await prisma.order.findMany({
      where: {
        restaurantId: input.restaurantId,
        createdAt: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
      select: {
        total: true,
      },
    });

    const previousRevenue = previousOrders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);
    const previousOrdersCount = previousOrders.length;

    // Calculate trends
    const revenueTrend =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;

    const ordersTrend =
      previousOrdersCount > 0
        ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100
        : totalOrders > 0
        ? 100
        : 0;

    // Revenue by status
    const revenueByStatus = orders.reduce((acc, order) => {
      const status = order.status;
      const orderTotal = Number.parseFloat(order.total.toString());
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += orderTotal;
      return acc;
    }, {} as Record<string, number>);

    // Orders by status
    const ordersByStatus = orders.reduce((acc, order) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      restaurant: {
        id: restaurant.userId,
        name: restaurant.name,
        mallId: restaurant.mallId,
      },
      period: {
        type: input.period || "all",
        startDate: periodStart,
        endDate: periodEnd,
      },
      summary: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalSubtotal: Number(totalSubtotal.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        totalDeliveryFee: Number(totalDeliveryFee.toFixed(2)),
        revenueByStatus,
        ordersByStatus,
      },
      trends: {
        revenue: {
          current: Number(totalRevenue.toFixed(2)),
          previous: Number(previousRevenue.toFixed(2)),
          change: Number(revenueTrend.toFixed(2)),
          direction: revenueTrend > 0 ? "up" : revenueTrend < 0 ? "down" : "neutral",
        },
        orders: {
          current: totalOrders,
          previous: previousOrdersCount,
          change: Number(ordersTrend.toFixed(2)),
          direction: ordersTrend > 0 ? "up" : ordersTrend < 0 ? "down" : "neutral",
        },
      },
    };
  },

  /**
   * Get promoCode details: users, orders, total discount
   */
  async getPromoCodeDetails(input: GetPromoCodeDetailsInput) {
    const promoCode = await (prisma as any).promoCode.findUnique({
      where: { id: input.promoCodeId },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
      },
    });

    if (!promoCode) {
      throw new Error("PromoCode not found");
    }

    // Get all orders using this promoCode
    const orders = await prisma.order.findMany({
      where: { promoCodeId: input.promoCodeId },
      select: {
        id: true,
        total: true,
        discount: true,
        userId: true,
        createdAt: true,
      },
    });

    // Get unique users who used this promoCode
    const uniqueUserIds = new Set(orders.map((order) => order.userId));
    const totalUsers = uniqueUserIds.size;

    // Calculate totals
    const totalOrders = orders.length;
    const totalDiscount = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.discount.toString());
    }, 0);
    const totalOrderValue = orders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);

    return {
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discountType,
        discountValue: Number.parseFloat(promoCode.discountValue.toString()),
        validFrom: promoCode.validFrom,
        validUntil: promoCode.validUntil,
        isActive: promoCode.isActive,
      },
      statistics: {
        totalUsers,
        totalOrders,
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalOrderValue: Number(totalOrderValue.toFixed(2)),
      },
    };
  },

  /**
   * Get promoCode usage over time
   */
  async getPromoCodeUsageOverTime(input: GetPromoCodeUsageOverTimeInput) {
    const promoCode = await (prisma as any).promoCode.findUnique({
      where: { id: input.promoCodeId },
    });

    if (!promoCode) {
      throw new Error("PromoCode not found");
    }

    const now = new Date();
    let periodStart: Date;

    switch (input.period || "month") {
      case "week":
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case "month":
        periodStart = new Date(now);
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      case "year":
        periodStart = new Date(now);
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
      default:
        periodStart = new Date(now);
        periodStart.setMonth(periodStart.getMonth() - 1);
    }

    // Get orders using this promoCode in the period
    const orders = await prisma.order.findMany({
      where: {
        promoCodeId: input.promoCodeId,
        createdAt: {
          gte: periodStart,
          lte: now,
        },
      },
      select: {
        id: true,
        createdAt: true,
        discount: true,
        total: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by day for week/month, by month for year
    const usageData: Record<string, { orders: number; discount: number }> = {};

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key: string;

      if (input.period === "year") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }

      if (!usageData[key]) {
        usageData[key] = { orders: 0, discount: 0 };
      }

      // usageData[key] must exist - we just set it above if it didn't
      usageData[key]!.orders += 1;
      usageData[key]!.discount += Number.parseFloat(order.discount.toString());
    });

    return {
      promoCodeId: input.promoCodeId,
      period: input.period || "month",
      usageOverTime: Object.entries(usageData).map(([date, data]) => ({
        date,
        orders: data.orders,
        totalDiscount: Number(data.discount.toFixed(2)),
      })),
    };
  },

  /**
   * Get discount impact by order value ranges
   */
  async getPromoCodeDiscountImpact(promoCodeId: string) {
    const promoCode = await (prisma as any).promoCode.findUnique({
      where: { id: promoCodeId },
    });

    if (!promoCode) {
      throw new Error("PromoCode not found");
    }

    // Get all orders using this promoCode
    const orders = await prisma.order.findMany({
      where: { promoCodeId },
      select: {
        id: true,
        total: true,
        discount: true,
        subtotal: true,
      },
    });

    // Define order value ranges
    const ranges = [
      { label: "0-5k", min: 0, max: 5000 },
      { label: "5k-10k", min: 5000, max: 10000 },
      { label: "10k-20k", min: 10000, max: 20000 },
      { label: "20k+", min: 20000, max: Infinity },
    ];

    const impactData = ranges.map((range) => {
      const ordersInRange = orders.filter((order) => {
        const orderValue = Number.parseFloat(order.subtotal.toString());
        return orderValue >= range.min && orderValue < range.max;
      });

      const totalOrders = ordersInRange.length;
      const totalDiscount = ordersInRange.reduce((sum, order) => {
        return sum + Number.parseFloat(order.discount.toString());
      }, 0);

      return {
        orderValueRange: range.label,
        orders: totalOrders,
        totalDiscount: Number(totalDiscount.toFixed(2)),
      };
    });

    return {
      promoCodeId,
      discountImpact: impactData,
    };
  },

  /**
   * Get orders using promoCode with pagination
   */
  async getPromoCodeOrders(input: GetPromoCodeOrdersInput) {
    const promoCode = await (prisma as any).promoCode.findUnique({
      where: { id: input.promoCodeId },
    });

    if (!promoCode) {
      throw new Error("PromoCode not found");
    }

    const page = input.page || 1;
    const limit = input.limit || 10;

    // Get total count
    const total = await prisma.order.count({
      where: { promoCodeId: input.promoCodeId },
    });

    // Get paginated orders
    const orders = await prisma.order.findMany({
      where: { promoCodeId: input.promoCodeId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        subtotal: true,
        tax: true,
        deliveryFee: true,
        discount: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      orders: orders.map((order) => {
        const subtotal = Number.parseFloat(order.subtotal.toString());
        const tax = Number.parseFloat(order.tax.toString());
        const deliveryFee = Number.parseFloat(order.deliveryFee.toString());
        const discount = Number.parseFloat(order.discount.toString());
        const total = Number.parseFloat(order.total.toString());
        // Original amount before discount = subtotal + tax + deliveryFee
        const originalAmount = subtotal + tax + deliveryFee;

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          date: order.createdAt.toISOString().split("T")[0],
          time: order.createdAt.toTimeString().split(" ")[0],
          totalAmount: total,
          discountGiven: discount,
          discountedAmount: originalAmount, // Original amount before discount
          status: order.status,
          createdAt: order.createdAt,
        };
      }),
    };
  },
  // Get all restaurants in the system with pagination
  async getAllRestaurantsSystemWide(
    page: number = 1,
    limit: number = 10,
    mallId?: string,
    category?: string
  ) {
    const where: any = {};
    if (mallId) where.mallId = mallId;
    if (category) where.mainCategory = category;

    const total = await prisma.restaurant.count({ where });

    const restaurants = await prisma.restaurant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
          },
        },
        mall: {
          select: {
            id: true,
            name: true,
            address: true,
            cityId: true,
          },
        },
        cuisineCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orders: true,
            menuCategories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate revenue for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const orders = await prisma.order.findMany({
          where: { restaurantId: restaurant.userId },
          select: {
            total: true,
            status: true,
          },
        });

        const totalRevenue = orders.reduce((sum, order) => {
          return sum + Number.parseFloat(order.total.toString());
        }, 0);

        return {
          id: restaurant.userId,
          name: restaurant.name,
          mainCategory: restaurant.mainCategory,
          banner: restaurant.banner,
          description: restaurant.description,
          location: restaurant.location,
          isFavorite: restaurant.isFavorite,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
          owner: {
            id: restaurant.user.id,
            name: restaurant.user.name,
            email: restaurant.user.email,
            phoneNumber: restaurant.user.phoneNumber,
            image: restaurant.user.image,
          },
          mall: {
            id: restaurant.mall.id,
            name: restaurant.mall.name,
            address: restaurant.mall.address,
            cityId: restaurant.mall.cityId,
          },
          cuisineCategory: restaurant.cuisineCategory
            ? {
                id: restaurant.cuisineCategory.id,
                name: restaurant.cuisineCategory.name,
              }
            : null,
          statistics: {
            totalOrders: restaurant._count.orders,
            totalMenuCategories: restaurant._count.menuCategories,
            totalRevenue: Number(totalRevenue.toFixed(2)),
          },
        };
      })
    );

    return {
      data: restaurantsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};

