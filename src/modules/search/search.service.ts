import prisma from "../../config/prisma";
import { activeSubscriptionWhere } from "../restaurant/subscription/subscription.service";

/**
 * Search behavior (post-rewrite, 2026-05):
 * - Always runs BOTH the restaurant-name search and the menu-item search in
 *   parallel. The previous "if restaurants matched, skip menu items" rule
 *   meant a menu item could never surface if any restaurant name partially
 *   shared the query (e.g. "rest" hiding a "Pesto Rest..." item).
 * - When `mallId` is provided, both searches are scoped to that mall — the
 *   customer-facing flow always passes the selected mall, so cross-mall
 *   bleed (Karachi searches returning Muscat hits) is eliminated.
 * - Returns a mixed response: `{ restaurants, menuItems, totalResults }`.
 *   Menu items carry enough context (`restaurantId`, `restaurantName`) for
 *   the UI to navigate straight to ProductDetailsScreen on tap.
 * - Both lists are filtered by `activeSubscriptionWhere()` so only paid /
 *   active restaurants surface to customers.
 */
export const searchService = {
  async search(q: string, mallId?: string) {
    const query = q.trim();
    if (!query) return { restaurants: [], menuItems: [], totalResults: 0 };

    // Shared filter used by both queries.
    const restaurantFilter = {
      ...activeSubscriptionWhere(),
      ...(mallId ? { mallId } : {}),
    };

    try {
      const [restaurantRows, menuItemRows] = await Promise.all([
        prisma.restaurant.findMany({
          where: {
            ...restaurantFilter,
            name: { contains: query, mode: "insensitive" },
          },
          select: {
            userId: true,
            name: true,
            banner: true,
            location: true,
            isFavorite: true,
            cuisines: true,
            estimatedDeliveryTime: true,
          },
          take: 50,
        }),
        prisma.menuItem.findMany({
          where: {
            name: { contains: query, mode: "insensitive" },
            category: {
              restaurant: restaurantFilter,
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image: true,
            category: {
              select: {
                restaurant: {
                  select: {
                    userId: true,
                    name: true,
                    banner: true,
                  },
                },
              },
            },
          },
          take: 50,
        }),
      ]);

      const restaurants = restaurantRows.map((r) => ({
        id: r.userId,
        name: r.name,
        image: r.banner,
        location: r.location,
        isFavorite: !!r.isFavorite,
        cuisines: r.cuisines || [],
        estimatedDeliveryTime: r.estimatedDeliveryTime || null,
      }));

      const menuItems = menuItemRows
        .filter((m) => !!m.category?.restaurant)
        .map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          // Decimal -> number for JSON serialization.
          price: m.price ? Number(m.price) : 0,
          image: m.image,
          restaurantId: m.category!.restaurant!.userId,
          restaurantName: m.category!.restaurant!.name,
          restaurantImage: m.category!.restaurant!.banner,
        }));

      return {
        restaurants,
        menuItems,
        totalResults: restaurants.length + menuItems.length,
      };
    } catch (err) {
      console.error("[searchService] error", (err as any)?.stack || err);
      throw err;
    }
  },
};
