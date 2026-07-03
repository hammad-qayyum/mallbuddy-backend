import prisma from "../../../config/prisma";

export const adminSearchService = {
  // Unified search across malls, restaurants, and users by name.
  // `scopeMallId` (GAP-018): null for the super admin; for MALL_ADMIN the
  // search is confined to their mall — only their own mall record,
  // restaurants of that mall, and USER accounts shopping that mall.
  async unifiedSearch(params: {
    name?: string;
    page: number;
    limit: number;
    scopeMallId?: string | null;
  }) {
    const searchName = params.name || '';
    const skip = (params.page - 1) * params.limit;
    const take = params.limit;
    const scopeMallId = params.scopeMallId;

    const where = {
      name: { contains: searchName, mode: 'insensitive' as const },
      ...(scopeMallId && { id: scopeMallId }),
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
      ...(scopeMallId && { mallId: scopeMallId }),
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
      ...(scopeMallId && { role: 'USER' as const, selectedMallId: scopeMallId }),
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
