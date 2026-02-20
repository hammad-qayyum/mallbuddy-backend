import prisma from "../../config/prisma";

/**
 * Search service behavior:
 * - If `q` matches restaurant.name (case-insensitive contains) -> return restaurant cards and totalResults (matching restaurants count)
 * - Otherwise, try to match menu items by name; return unique restaurants that offer those menu items and totalResults (number of restaurants)
 * - If nothing found, caller should return 404 with message 'Sorry Not found'
 */
export const searchService = {
  async search(q: string) {
    const query = q.trim();
    if (!query) return { restaurants: [], totalResults: 0 };

    try {
      // 1) Look for restaurants whose name matches the query
      const restaurantMatches = await prisma.restaurant.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        select: {
          userId: true,
          name: true,
          banner: true,
          location: true,
          isFavorite: true,
          cuisineCategoryId: true,
          estimatedDeliveryTime: true,
        },
        take: 100,
      });

      // helper to map cuisine ids -> names
      const cuisineIds = Array.from(new Set(restaurantMatches.map((r) => r.cuisineCategoryId).filter(Boolean))) as string[];
      const cuisineMap = new Map<string, { id: string; name: string }>();
      if (cuisineIds.length) {
        const cuisines = await prisma.cuisineCategory.findMany({ where: { id: { in: cuisineIds } } });
        cuisines.forEach((c) => cuisineMap.set(c.id, { id: c.id, name: c.name }));
      }

      if (restaurantMatches.length > 0) {
        const restaurants = restaurantMatches.map((r) => ({
          id: r.userId,
          name: r.name,
          image: r.banner,
          location: r.location,
          isFavorite: !!r.isFavorite,
          cuisine: r.cuisineCategoryId ? cuisineMap.get(r.cuisineCategoryId)?.name ?? null : null,
          estimatedDeliveryTime: r.estimatedDeliveryTime || null,
        }));

        return { restaurants, totalResults: restaurants.length };
      }

      // 2) No restaurant name matches -> search menu items and map to restaurants
      const items = await prisma.menuItem.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        select: { id: true, name: true, categoryId: true },
        take: 500,
      });

      if (!items || items.length === 0) return { restaurants: [], totalResults: 0 };

      // collect restaurantIds via MenuCategory -> restaurantId
      const categoryIds = Array.from(new Set(items.map((i) => i.categoryId).filter(Boolean))) as string[];
      const categories = await prisma.menuCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, restaurantId: true } });
      const restaurantIds = Array.from(new Set(categories.map((c) => c.restaurantId)));

      if (restaurantIds.length === 0) return { restaurants: [], totalResults: 0 };

      const restRows = await prisma.restaurant.findMany({
        where: { userId: { in: restaurantIds } },
        select: { userId: true, name: true, banner: true, location: true, isFavorite: true, cuisineCategoryId: true, estimatedDeliveryTime: true },
      });

      const cuisineIds2 = Array.from(new Set(restRows.map((r) => r.cuisineCategoryId).filter(Boolean))) as string[];
      const cuisineMap2 = new Map<string, { id: string; name: string }>();
      if (cuisineIds2.length) {
        const cuisines = await prisma.cuisineCategory.findMany({ where: { id: { in: cuisineIds2 } } });
        cuisines.forEach((c) => cuisineMap2.set(c.id, { id: c.id, name: c.name }));
      }

      const restaurants = restRows.map((r) => ({
        id: r.userId,
        name: r.name,
        image: r.banner,
        location: r.location,
        isFavorite: !!r.isFavorite,
        cuisine: r.cuisineCategoryId ? cuisineMap2.get(r.cuisineCategoryId)?.name ?? null : null,
        estimatedDeliveryTime: r.estimatedDeliveryTime || null,
      }));

      return { restaurants, totalResults: restaurants.length };
    } catch (err) {
      console.error('[searchService] error', (err as any)?.stack || err);
      throw err;
    }
  },
};
