import prisma from "../../config/prisma";

/**
 * Favourite Menu Item Service
 *
 * Manages individual menu-item favourites (the heart icon on a menu item).
 * Distinct from FavouriteCart, which saves an entire cart for re-ordering.
 * All operations are scoped to the authenticated user (BUG-004).
 */
export const favouriteMenuItemService = {
  // List the user's favourite menu items with enough detail to render a card.
  async listFavourites(userId: string) {
    const favourites = await prisma.favouriteMenuItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        menuItem: {
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
        },
      },
    });

    return favourites.map((f) => ({
      favouriteId: f.id,
      favouritedAt: f.createdAt,
      menuItem: f.menuItem,
    }));
  },

  // Lightweight list of favourited menu-item IDs — used by the app to render
  // heart states across a menu without fetching full details.
  async listFavouriteIds(userId: string): Promise<string[]> {
    const rows = await prisma.favouriteMenuItem.findMany({
      where: { userId },
      select: { menuItemId: true },
    });
    return rows.map((r) => r.menuItemId);
  },

  // Add a favourite (idempotent).
  async addFavourite(userId: string, menuItemId: string) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });
    if (!menuItem) throw new Error("Menu item not found");

    await prisma.favouriteMenuItem.upsert({
      where: { userId_menuItemId: { userId, menuItemId } },
      create: { userId, menuItemId },
      update: {},
    });
    return { menuItemId, favourited: true };
  },

  // Remove a favourite (idempotent).
  async removeFavourite(userId: string, menuItemId: string) {
    await prisma.favouriteMenuItem.deleteMany({ where: { userId, menuItemId } });
    return { menuItemId, favourited: false };
  },

  // Toggle a favourite; returns the resulting state.
  async toggleFavourite(userId: string, menuItemId: string) {
    const existing = await prisma.favouriteMenuItem.findUnique({
      where: { userId_menuItemId: { userId, menuItemId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.favouriteMenuItem.delete({ where: { id: existing.id } });
      return { menuItemId, favourited: false };
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });
    if (!menuItem) throw new Error("Menu item not found");

    await prisma.favouriteMenuItem.create({ data: { userId, menuItemId } });
    return { menuItemId, favourited: true };
  },
};
