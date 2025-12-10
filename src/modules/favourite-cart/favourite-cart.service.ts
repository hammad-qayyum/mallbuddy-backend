import prisma from "../../config/prisma";
import {
  CreateFavouriteCartInput,
  AddToFavouriteCartInput,
  UpdateFavouriteCartItemInput,
  UpdateFavouriteCartInput,
  RestoreFavouriteCartInput,
} from "./favourite-cart.schema";

export const favouriteCartService = {
  // Create a new favourite cart
  async createFavouriteCart(userId: string, data: CreateFavouriteCartInput) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const favouriteCart = await prisma.favouriteCart.create({
      data: {
        userId,
        name: data.name,
        description: data.description || null,
      },
      include: {
        items: {
          include: {
            menuItem: true,
            restaurant: {
              include: { user: true },
            },
          },
        },
      },
    });

    // Copy items from current cart if requested (default is true)
    if (data.copyFromCurrentCart !== false) {
      const currentCart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: true,
        },
      });

      if (currentCart && currentCart.items.length > 0) {
        // Copy all items from current cart to favourite cart
        await prisma.favouriteCartItem.createMany({
          data: currentCart.items.map((item) => ({
            favouriteCartId: favouriteCart.id,
            restaurantId: item.restaurantId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            specialNotes: item.specialNotes,
          })),
        });

        // Fetch the favourite cart with items included
        return prisma.favouriteCart.findUnique({
          where: { id: favouriteCart.id },
          include: {
            items: {
              include: {
                menuItem: true,
                restaurant: {
                  include: { user: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }
    }

    return favouriteCart;
  },

  // Get all favourite carts for a user
  async getFavouriteCarts(userId: string) {
    const favouriteCarts = await prisma.favouriteCart.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            restaurant: {
              include: { user: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favouriteCarts;
  },

  // Get a single favourite cart
  async getFavouriteCart(userId: string, favouriteCartId: string) {
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
            restaurant: {
              include: { user: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    return favouriteCart;
  },

  // Add item to favourite cart (or update quantity if already exists)
  async addToFavouriteCart(userId: string, favouriteCartId: string, data: AddToFavouriteCartInput) {
    // Verify favourite cart belongs to user
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    // Verify menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: data.menuItemId },
    });

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: data.restaurantId },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Check if item already exists in favourite cart
    const existingItem = await prisma.favouriteCartItem.findUnique({
      where: {
        favouriteCartId_menuItemId: {
          favouriteCartId,
          menuItemId: data.menuItemId,
        },
      },
    });

    if (existingItem && existingItem.restaurantId === data.restaurantId) {
      // Update quantity if item already exists from same restaurant
      return await prisma.favouriteCartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + data.quantity,
          ...(data.specialNotes && { specialNotes: data.specialNotes }),
        },
        include: {
          menuItem: true,
          restaurant: {
            include: { user: true },
          },
        },
      });
    }

    // Create new favourite cart item
    return await prisma.favouriteCartItem.create({
      data: {
        favouriteCartId,
        menuItemId: data.menuItemId,
        restaurantId: data.restaurantId,
        quantity: data.quantity,
        specialNotes: data.specialNotes || null,
      },
      include: {
        menuItem: true,
        restaurant: {
          include: { user: true },
        },
      },
    });
  },

  // Update favourite cart item (quantity and special notes)
  async updateFavouriteCartItem(
    userId: string,
    favouriteCartId: string,
    itemId: string,
    data: UpdateFavouriteCartItemInput
  ) {
    // Verify favourite cart belongs to user
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    // Verify the item belongs to the favourite cart
    const cartItem = await prisma.favouriteCartItem.findFirst({
      where: {
        id: itemId,
        favouriteCartId,
      },
    });

    if (!cartItem) {
      throw new Error("Item not found in favourite cart");
    }

    // Update item
    return await prisma.favouriteCartItem.update({
      where: { id: itemId },
      data: {
        ...(data.quantity && { quantity: data.quantity }),
        ...(data.specialNotes !== undefined && { specialNotes: data.specialNotes }),
      },
      include: {
        menuItem: true,
        restaurant: {
          include: { user: true },
        },
      },
    });
  },

  // Remove item from favourite cart
  async removeFromFavouriteCart(userId: string, favouriteCartId: string, itemId: string) {
    // Verify favourite cart belongs to user
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    // Verify the item belongs to the favourite cart
    const cartItem = await prisma.favouriteCartItem.findFirst({
      where: {
        id: itemId,
        favouriteCartId,
      },
    });

    if (!cartItem) {
      throw new Error("Item not found in favourite cart");
    }

    await prisma.favouriteCartItem.delete({
      where: { id: itemId },
    });

    return { message: "Item removed from favourite cart successfully" };
  },

  // Update favourite cart (name and description)
  async updateFavouriteCart(userId: string, favouriteCartId: string, data: UpdateFavouriteCartInput) {
    // Verify favourite cart belongs to user
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    const updated = await prisma.favouriteCart.update({
      where: { id: favouriteCartId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: {
        items: {
          include: {
            menuItem: true,
            restaurant: {
              include: { user: true },
            },
          },
        },
      },
    });

    return updated;
  },

  // Delete a favourite cart
  async deleteFavouriteCart(userId: string, favouriteCartId: string) {
    // Verify favourite cart belongs to user
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    // Delete all items in favourite cart (cascade handled by Prisma)
    await prisma.favouriteCart.delete({
      where: { id: favouriteCartId },
    });

    return { message: "Favourite cart deleted successfully" };
  },

  // Restore favourite cart to current cart
  async restoreFavouriteCartToCart(
    userId: string,
    favouriteCartId: string,
    options: RestoreFavouriteCartInput
  ) {
    // Verify favourite cart exists and belongs to user
    const favouriteCart = await prisma.favouriteCart.findFirst({
      where: {
        id: favouriteCartId,
        userId,
      },
      include: {
        items: {
          include: {
            menuItem: true,
            restaurant: true,
          },
        },
      },
    });

    if (!favouriteCart) {
      throw new Error("Favourite cart not found");
    }

    // Get or create user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    // If replaceCurrent is true, clear current cart
    if (options.replaceCurrent) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    // Add all items from favourite cart to current cart
    const addedItems = [];

    for (const favItem of favouriteCart.items) {
      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_menuItemId: {
            cartId: cart.id,
            menuItemId: favItem.menuItemId,
          },
        },
      });

      if (existingItem && existingItem.restaurantId === favItem.restaurantId) {
        // Update quantity if item already exists from same restaurant
        const updated = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + favItem.quantity,
            specialNotes: favItem.specialNotes,
          },
          include: {
            menuItem: true,
            restaurant: {
              include: { user: true },
            },
          },
        });
        addedItems.push(updated);
      } else {
        // Create new cart item
        const created = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            menuItemId: favItem.menuItemId,
            restaurantId: favItem.restaurantId,
            quantity: favItem.quantity,
            specialNotes: favItem.specialNotes,
          },
          include: {
            menuItem: true,
            restaurant: {
              include: { user: true },
            },
          },
        });
        addedItems.push(created);
      }
    }

    return {
      message: "Favourite cart restored to current cart successfully",
      itemsAdded: addedItems.length,
      items: addedItems,
    };
  },

  // Get favourite cart summary (grouped by restaurant)
  async getFavouriteCartSummary(userId: string, favouriteCartId: string) {
    const favouriteCart = await this.getFavouriteCart(userId, favouriteCartId);

    if (favouriteCart.items.length === 0) {
      return {
        favouriteCartId: favouriteCart.id,
        favouriteCartName: favouriteCart.name,
        totalItems: 0,
        totalPrice: 0,
        restaurants: [],
      };
    }

    // Group items by restaurant
    const restaurantMap = new Map<
      string,
      {
        restaurantId: string;
        restaurantName: string;
        items: (typeof favouriteCart.items)[0][];
        subtotal: number;
      }
    >();

    let totalPrice = 0;

    favouriteCart.items.forEach((item: any) => {
      const restId = item.restaurantId;
      const itemTotal = Number(item.menuItem.price) * item.quantity;
      totalPrice += itemTotal;

      if (!restaurantMap.has(restId)) {
        restaurantMap.set(restId, {
          restaurantId: restId,
          restaurantName: item.restaurant.user.name || "Unknown",
          items: [],
          subtotal: 0,
        });
      }

      const restaurant = restaurantMap.get(restId)!;
      restaurant.items.push(item);
      restaurant.subtotal += itemTotal;
    });

    return {
      favouriteCartId: favouriteCart.id,
      favouriteCartName: favouriteCart.name,
      totalItems: favouriteCart.items.length,
      totalPrice: Number(totalPrice.toFixed(2)),
      restaurants: Array.from(restaurantMap.values()),
    };
  },
};
