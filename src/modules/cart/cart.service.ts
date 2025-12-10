import prisma from "../../config/prisma";
import { AddToCartServiceInput, UpdateCartItemInput } from "./cart.schema";

export const cartService = {
  // Get or create cart for a user
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
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

    // If cart doesn't exist, create it
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
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
    }

    return cart;
  },

  // Get user's cart with all items and details
  async getCart(userId: string) {
    const cart = await prisma.cart.findUnique({
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
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cart) {
      return {
        id: "",
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return cart;
  },

  // Add item to cart (or update quantity if item already exists from same restaurant)
  async addToCart(userId: string, data: AddToCartServiceInput) {
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

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart from the same restaurant
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_menuItemId: {
          cartId: cart.id,
          menuItemId: data.menuItemId,
        },
      },
    });

    if (existingItem && existingItem.restaurantId === data.restaurantId) {
      // Update quantity if item already exists from same restaurant
      return await prisma.cartItem.update({
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

    // Create new cart item
    return await prisma.cartItem.create({
      data: {
        cartId: cart.id,
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

  // Update cart item (quantity and special notes)
  async updateCartItem(userId: string, cartItemId: string, data: UpdateCartItemInput) {
    // Verify the cart item belongs to the user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId },
      },
    });

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    // Update item
    return await prisma.cartItem.update({
      where: { id: cartItemId },
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

  // Remove item from cart
  async removeFromCart(userId: string, cartItemId: string) {
    // Verify the cart item belongs to the user
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId },
      },
    });

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    return await prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  },

  // Clear entire cart for a user
  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    // Delete all items in cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: "Cart cleared successfully" };
  },

  // Get cart summary (total price, item count, by restaurant)
  async getCartSummary(userId: string) {
    const cart = await this.getCart(userId);

    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        cartId: cart?.id || "",
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
        items: (typeof cart.items)[0][];
        subtotal: number;
      }
    >();

    let totalPrice = 0;

    cart.items.forEach((item: any) => {
      if (!item || !item.menuItem || !item.restaurantId) {
        return; // Skip invalid items
      }

      const restId = item.restaurantId;
      const itemTotal = Number(item.menuItem.price || 0) * (item.quantity || 0);
      totalPrice += itemTotal;

      if (!restaurantMap.has(restId)) {
        restaurantMap.set(restId, {
          restaurantId: restId,
          restaurantName: item.restaurant?.user?.name || "Unknown",
          items: [],
          subtotal: 0,
        });
      }

      const restaurant = restaurantMap.get(restId)!;
      restaurant.items.push(item);
      restaurant.subtotal += itemTotal;
    });

    return {
      cartId: cart.id || "",
      totalItems: cart.items.length,
      totalPrice: Number(totalPrice.toFixed(2)),
      restaurants: Array.from(restaurantMap.values()),
    };
  },
};
