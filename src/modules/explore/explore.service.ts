import prisma from "../../config/prisma";

function hasGalleryModel() {
  try {
    const m = (prisma as any).restaurantGallery;
    return !!(m && typeof m.findMany === "function");
  } catch (e) {
    return false;
  }
}

export const exploreService = {
  async getExploreRestaurants(): Promise<any[]> {
    try {
      const restaurants = await prisma.restaurant.findMany({
        select: {
          userId: true,
          name: true,
          banner: true,
          isFavorite: true,
          cuisineCategoryId: true,
        },
        orderBy: { name: "asc" },
      });

      const cuisineIds = Array.from(new Set(restaurants.map((r) => r.cuisineCategoryId).filter(Boolean))) as string[];
      const cuisineMap = new Map<string, { id: string; name: string }>();
      if (cuisineIds.length) {
        const cuisines = await prisma.cuisineCategory.findMany({ where: { id: { in: cuisineIds } } });
        cuisines.forEach((c) => cuisineMap.set(c.id, { id: c.id, name: c.name }));
      }

      return restaurants.map((r) => ({
        userId: r.userId,
        name: r.name ?? "",
        ...(r.banner != null ? { banner: r.banner } : {}),
        isFavorite: r.isFavorite,
        ...(r.cuisineCategoryId && cuisineMap.has(r.cuisineCategoryId)
          ? { cuisineCategory: cuisineMap.get(r.cuisineCategoryId) }
          : {}),
      }));
    } catch (err) {
      console.error('[exploreService] getExploreRestaurants error:', (err as any)?.stack || err);
      throw err;
    }
  },

  async getExploreRestaurantDetail(id: string): Promise<any | null> {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: id },
        select: { userId: true, name: true, story: true },
      });

      if (!restaurant) return null;

      let galleryRows: { id: string; imageUrl: string }[] = [];
      if (hasGalleryModel()) {
        galleryRows = await (prisma as any).restaurantGallery.findMany({
          where: { restaurantId: id },
          select: { id: true, imageUrl: true },
          orderBy: { createdAt: "asc" },
        });
      } else {
        galleryRows = (await prisma.$queryRaw`
          SELECT "id", "imageUrl"
          FROM "RestaurantGallery"
          WHERE "restaurantId" = ${id}
          ORDER BY "createdAt" ASC
        `) as { id: string; imageUrl: string }[];
      }

      const gallery = galleryRows.map((g) => ({ id: g.id, imageUrl: g.imageUrl }));

      return {
        userId: restaurant.userId,
        name: restaurant.name ?? "",
        gallery,
        ...(restaurant.story != null ? { story: restaurant.story } : {}),
      };
    } catch (err) {
      console.error('[exploreService] getExploreRestaurantDetail error:', (err as any)?.stack || err, { id });
      throw err;
    }
  },

  async getRestaurantStory(id: string): Promise<{ userId: string; name: string; story?: string } | null> {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { userId: id },
        select: { userId: true, name: true, story: true },
      });

      if (!restaurant) return null;

      return {
        userId: restaurant.userId,
        name: restaurant.name ?? "",
        ...(restaurant.story != null ? { story: restaurant.story } : {}),
      };
    } catch (err) {
      console.error('[exploreService] getRestaurantStory error:', (err as any)?.stack || err, { id });
      throw err;
    }
  },
};

export default exploreService;
