import prisma from "../../config/prisma";
import {
  CreateFavouriteCartInput,
  AddToFavouriteCartInput,
  UpdateFavouriteCartItemInput,
  UpdateFavouriteCartInput,
  RestoreFavouriteCartInput,
} from "./favourite-cart.schema";

// Helper select objects for consistent data selection
const favouriteCartItemSelect = {
  id: true,
  favouriteCartId: true,
  restaurantId: true,
  menuItemId: true,
  quantity: true,
  specialNotes: true,
  selectedVariations: true,
  selectedAddOns: true,
  createdAt: true,
  updatedAt: true,
  menuItem: {
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      image: true,
      preparationTime: true,
    },
  },
  restaurant: {
    select: {
      userId: true,
      name: true,
      mainCategory: true,
      banner: true,
    },
  },
};

const favouriteCartItemWithCategorySelect = {
  ...favouriteCartItemSelect,
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
        },
      },
    },
  },
};

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
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: favouriteCartItemSelect,
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
        // Copy all items from current cart to favourite cart (including variations and add-ons)
        await prisma.favouriteCartItem.createMany({
          data: currentCart.items.map((item) => ({
            favouriteCartId: favouriteCart.id,
            restaurantId: item.restaurantId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            specialNotes: item.specialNotes,
            selectedVariations: item.selectedVariations ? (item.selectedVariations as any) : null,
            selectedAddOns: item.selectedAddOns ? (item.selectedAddOns as any) : null,
          })),
        });

        // Fetch the favourite cart with items included
        return prisma.favouriteCart.findUnique({
          where: { id: favouriteCart.id },
          select: {
            id: true,
            userId: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            items: {
              select: favouriteCartItemSelect,
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
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: favouriteCartItemWithCategorySelect,
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
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: favouriteCartItemWithCategorySelect,
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

    // Find all items with the same menuItemId in this favourite cart
    const existingItems = await prisma.favouriteCartItem.findMany({
      where: {
        favouriteCartId,
        menuItemId: data.menuItemId,
        restaurantId: data.restaurantId,
      },
    });

    // Normalize selections for comparison
    const normalizeSelections = (variations?: any[], addOns?: any[]) => {
      const normVars = variations
        ? JSON.stringify(
            variations
              .map((v) => ({ variationId: v.variationId, selectedOptionId: v.selectedOptionId }))
              .sort((a, b) => a.variationId.localeCompare(b.variationId))
          )
        : "[]";
      const normAddOns = addOns
        ? JSON.stringify(
            addOns
              .map((a) => ({
                addOnId: a.addOnId,
                selectedOptionIds: a.selectedOptionIds.sort(),
              }))
              .sort((a, b) => a.addOnId.localeCompare(b.addOnId))
          )
        : "[]";
      return `${normVars}|${normAddOns}`;
    };

    const newSelectionKey = normalizeSelections(data.selectedVariations, data.selectedAddOns);

    // Check if an item with the same selections exists
    for (const existingItem of existingItems) {
      const existingVariations = existingItem.selectedVariations
        ? (existingItem.selectedVariations as Array<{ variationId: string; selectedOptionId: string }>)
        : [];
      const existingAddOns = existingItem.selectedAddOns
        ? (existingItem.selectedAddOns as Array<{ addOnId: string; selectedOptionIds: string[] }>)
        : [];

      const existingSelectionKey = normalizeSelections(existingVariations, existingAddOns);

      if (existingSelectionKey === newSelectionKey) {
        // Update quantity if item already exists with same configuration
        return await prisma.favouriteCartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + data.quantity,
            ...(data.specialNotes && { specialNotes: data.specialNotes }),
          },
          select: favouriteCartItemSelect,
        });
      }
    }

    // Create new favourite cart item
    return await prisma.favouriteCartItem.create({
      data: {
        favouriteCartId,
        menuItemId: data.menuItemId,
        restaurantId: data.restaurantId,
        quantity: data.quantity,
        specialNotes: data.specialNotes || null,
        selectedVariations: data.selectedVariations ? (data.selectedVariations as any) : null,
        selectedAddOns: data.selectedAddOns ? (data.selectedAddOns as any) : null,
      },
      select: favouriteCartItemSelect,
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
      select: favouriteCartItemSelect,
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
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: favouriteCartItemSelect,
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

    // Normalize selections for comparison
    const normalizeSelections = (variations?: any[], addOns?: any[]) => {
      const normVars = variations
        ? JSON.stringify(
            variations
              .map((v) => ({ variationId: v.variationId, selectedOptionId: v.selectedOptionId }))
              .sort((a, b) => a.variationId.localeCompare(b.variationId))
          )
        : "[]";
      const normAddOns = addOns
        ? JSON.stringify(
            addOns
              .map((a) => ({
                addOnId: a.addOnId,
                selectedOptionIds: a.selectedOptionIds.sort(),
              }))
              .sort((a, b) => a.addOnId.localeCompare(b.addOnId))
          )
        : "[]";
      return `${normVars}|${normAddOns}`;
    };

    for (const favItem of favouriteCart.items) {
      // Find items with the same menuItemId in this cart
      const existingItems = await prisma.cartItem.findMany({
        where: {
          cartId: cart.id,
          menuItemId: favItem.menuItemId,
          restaurantId: favItem.restaurantId,
        },
      });

      // Get favourite item selections
      const favVariations = favItem.selectedVariations
        ? (favItem.selectedVariations as Array<{ variationId: string; selectedOptionId: string }>)
        : [];
      const favAddOns = favItem.selectedAddOns
        ? (favItem.selectedAddOns as Array<{ addOnId: string; selectedOptionIds: string[] }>)
        : [];
      const favSelectionKey = normalizeSelections(favVariations, favAddOns);

      // Find matching item with same selections
      let existingItem = null;
      for (const item of existingItems) {
        const itemVariations = item.selectedVariations
          ? (item.selectedVariations as Array<{ variationId: string; selectedOptionId: string }>)
          : [];
        const itemAddOns = item.selectedAddOns
          ? (item.selectedAddOns as Array<{ addOnId: string; selectedOptionIds: string[] }>)
          : [];
        const itemSelectionKey = normalizeSelections(itemVariations, itemAddOns);

        if (itemSelectionKey === favSelectionKey) {
          existingItem = item;
          break;
        }
      }

      if (existingItem) {
        // Update quantity if item already exists with same configuration
        const updated = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + favItem.quantity,
            specialNotes: favItem.specialNotes,
          },
          select: {
            id: true,
            cartId: true,
            restaurantId: true,
            menuItemId: true,
            quantity: true,
            specialNotes: true,
            selectedVariations: true,
            selectedAddOns: true,
            createdAt: true,
            updatedAt: true,
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
                preparationTime: true,
              },
            },
            restaurant: {
              select: {
                userId: true,
                name: true,
                mainCategory: true,
                banner: true,
              },
            },
          },
        });
        addedItems.push(updated);
      } else {
        // Create new cart item with variations and add-ons
        const created = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            menuItemId: favItem.menuItemId,
            restaurantId: favItem.restaurantId,
            quantity: favItem.quantity,
            specialNotes: favItem.specialNotes,
            selectedVariations: favItem.selectedVariations ? (favItem.selectedVariations as any) : null,
            selectedAddOns: favItem.selectedAddOns ? (favItem.selectedAddOns as any) : null,
          },
          select: {
            id: true,
            cartId: true,
            restaurantId: true,
            menuItemId: true,
            quantity: true,
            specialNotes: true,
            selectedVariations: true,
            selectedAddOns: true,
            createdAt: true,
            updatedAt: true,
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
                preparationTime: true,
              },
            },
            restaurant: {
              select: {
                userId: true,
                name: true,
                mainCategory: true,
                banner: true,
              },
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

    // Collect all variation and add-on option IDs to batch query
    const variationOptionIds = new Set<string>();
    const addOnOptionIds = new Set<string>();

    for (const item of favouriteCart.items) {
      if (item.selectedVariations) {
        const variations = item.selectedVariations as Array<{ variationId: string; selectedOptionId: string }>;
        variations.forEach((v) => variationOptionIds.add(v.selectedOptionId));
      }
      if (item.selectedAddOns) {
        const addOns = item.selectedAddOns as Array<{ addOnId: string; selectedOptionIds: string[] }>;
        addOns.forEach((a) => a.selectedOptionIds.forEach((id) => addOnOptionIds.add(id)));
      }
    }

    // Batch fetch all variation and add-on options
    const [variationOptions, addOnOptions] = await Promise.all([
      variationOptionIds.size > 0
        ? prisma.variationOption.findMany({
            where: { id: { in: Array.from(variationOptionIds) } },
            select: { id: true, priceModifier: true },
          })
        : Promise.resolve([]),
      addOnOptionIds.size > 0
        ? prisma.addOnOption.findMany({
            where: { id: { in: Array.from(addOnOptionIds) } },
            select: { id: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    // Create maps for quick lookup
    const variationOptionMap = new Map(variationOptions.map((opt) => [opt.id, opt.priceModifier.toNumber()]));
    const addOnOptionMap = new Map(addOnOptions.map((opt) => [opt.id, opt.price.toNumber()]));

    for (const item of favouriteCart.items) {
      const restId = item.restaurantId;
      let itemUnitPrice = Number(item.menuItem.price || 0);

      // Add variation option prices (using cached map)
      if (item.selectedVariations) {
        const variations = item.selectedVariations as Array<{
          variationId: string;
          selectedOptionId: string;
        }>;
        variations.forEach((variation) => {
          const priceModifier = variationOptionMap.get(variation.selectedOptionId);
          if (priceModifier !== undefined) {
            itemUnitPrice += priceModifier;
          }
        });
      }

      // Add add-on option prices (using cached map)
      if (item.selectedAddOns) {
        const addOns = item.selectedAddOns as Array<{
          addOnId: string;
          selectedOptionIds: string[];
        }>;
        addOns.forEach((addOn) => {
          addOn.selectedOptionIds.forEach((optionId) => {
            const price = addOnOptionMap.get(optionId);
            if (price !== undefined) {
              itemUnitPrice += price;
            }
          });
        });
      }

      const itemTotal = itemUnitPrice * item.quantity;
      totalPrice += itemTotal;

      if (!restaurantMap.has(restId)) {
        restaurantMap.set(restId, {
          restaurantId: restId,
          restaurantName: item.restaurant.name || "Unknown",
          items: [],
          subtotal: 0,
        });
      }

      const restaurant = restaurantMap.get(restId)!;
      restaurant.items.push(item);
      restaurant.subtotal += itemTotal;
    }

    return {
      favouriteCartId: favouriteCart.id,
      favouriteCartName: favouriteCart.name,
      totalItems: favouriteCart.items.length,
      totalPrice: Number(totalPrice.toFixed(2)),
      restaurants: Array.from(restaurantMap.values()),
    };
  },
};
