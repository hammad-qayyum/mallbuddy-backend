import prisma from "../../config/prisma";

export const menuSearchService = {
  /**
   * Search for menu items and categories within a specific restaurant
   * Searches categories by name and menu items by name and description
   */
  async searchMenuItems(restaurantId: string, query: string) {
    try {
      // First, verify the restaurant exists
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: restaurantId },
        select: { name: true },
      });

      if (!restaurant) {
        return null;
      }

      // Search for menu categories by name
      const categories = await prisma.menuCategory.findMany({
        where: {
          restaurantId,
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          _count: {
            select: { items: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      // Search for menu items by name and description
      const menuItems = await prisma.menuItem.findMany({
        where: {
          category: {
            restaurant: {
              userId: restaurantId,
            },
          },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          preparationTime: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 50, // Limit results
      });

      const categoriesFormatted = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder || null,
        itemCount: cat._count.items,
      }));

      const itemsFormatted = menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || null,
        price: Number(item.price),
        image: item.image || null,
        preparationTime: item.preparationTime || null,
        category: {
          id: item.category.id,
          name: item.category.name,
        },
      }));

      return {
        success: true,
        query,
        restaurantId,
        restaurantName: restaurant.name,
        results: {
          categories: categoriesFormatted,
          items: itemsFormatted,
        },
        totalResults: categoriesFormatted.length + itemsFormatted.length,
      };
    } catch (err) {
      console.error('[menuSearchService] searchMenuItems error:', (err as any)?.stack || err, {
        restaurantId,
        query,
      });
      throw err;
    }
  },
};

export default menuSearchService;
