import prisma from "../../../config/prisma";

export const adminSearchService = {
  // Unified search across malls, restaurants, and users by name
  async unifiedSearch(params: {
    name?: string;
    page: number;
    limit: number;
  }) {
    const searchName = params.name || '';
    const skip = (params.page - 1) * params.limit;
    const take = params.limit;

    const where = {
      name: { contains: searchName, mode: 'insensitive' as const },
    };

    // Search malls
    const [malls, mallCount] = await Promise.all([
      prisma.mall.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          city: {
            select: {
              id: true,
              name: true,
              countryId: true,
            },
          },
        },
      }),
      prisma.mall.count({ where }),
    ]);

    // Search restaurants
    const restaurantWhere = {
      name: { contains: searchName, mode: 'insensitive' as const },
    };
    const [restaurants, restaurantCount] = await Promise.all([
      prisma.restaurant.findMany({
        where: restaurantWhere,
        skip,
        take,
        select: {
          userId: true,
          name: true,
          description: true,
          mainCategory: true,
          RestaurantStatus: true,
          approvalStatus: true,
          mallId: true,
          createdAt: true,
        },
      }),
      prisma.restaurant.count({ where: restaurantWhere }),
    ]);

    // Search users by name (firstName, lastName, and name fields)
    const userWhere = {
      OR: [
        { name: { contains: searchName, mode: 'insensitive' as const } },
        { firstName: { contains: searchName, mode: 'insensitive' as const } },
        { lastName: { contains: searchName, mode: 'insensitive' as const } },
      ],
    };
    const [users, userCount] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          Status: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    return {
      results: {
        malls: {
          data: malls,
          total: mallCount,
        },
        restaurants: {
          data: restaurants,
          total: restaurantCount,
        },
        users: {
          data: users,
          total: userCount,
        },
      },
      pagination: {
        page: params.page,
        limit: params.limit,
        totalResults: mallCount + restaurantCount + userCount,
      },
    };
  },
};
