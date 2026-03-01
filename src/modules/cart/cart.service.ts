import prisma from "../../config/prisma";
import { AddToCartServiceInput, UpdateCartItemInput } from "./cart.schema";

export const cartService = {
  // Get or create cart for a user
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        items: {
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
        },
      },
    });

    // If cart doesn't exist, create it
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        select: {
          id: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          items: {
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
      select: {
        id: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        items: {
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
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        },
      },
    });

    if (!cart) {
      // Return empty cart structure
      return {
        id: null,
        userId,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Collect all variation and add-on option IDs to batch query
    const variationOptionIds = new Set<string>();
    const addOnOptionIds = new Set<string>();

    for (const item of cart.items) {
      if (item.selectedVariations) {
        const variations = item.selectedVariations as Array<{ variationId: string; selectedOptionId: string }>;
        variations.forEach((v) => variationOptionIds.add(v.selectedOptionId));
      }
      if (item.selectedAddOns) {
        const addOns = item.selectedAddOns as Array<{ addOnId: string; selectedOptionIds: string[] }>;
        addOns.forEach((a) => a.selectedOptionIds.forEach((id) => addOnOptionIds.add(id)));
      }
    }

    // Batch fetch all variation options with their variation details
    const variationOptionsData = variationOptionIds.size > 0
      ? await prisma.variationOption.findMany({
          where: { id: { in: Array.from(variationOptionIds) } },
          select: {
            id: true,
            name: true,
            priceModifier: true,
            variation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

    // Batch fetch all add-on options with their add-on details
    const addOnOptionsData = addOnOptionIds.size > 0
      ? await prisma.addOnOption.findMany({
          where: { id: { in: Array.from(addOnOptionIds) } },
          select: {
            id: true,
            name: true,
            price: true,
            addOn: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

    // Create maps for quick lookup
    const variationOptionMap = new Map(
      variationOptionsData.map((opt) => [
        opt.id,
        {
          id: opt.id,
          name: opt.name,
          priceModifier: opt.priceModifier.toNumber(),
          variationId: opt.variation.id,
          variationName: opt.variation.name,
        },
      ])
    );

    const addOnOptionMap = new Map(
      addOnOptionsData.map((opt) => [
        opt.id,
        {
          id: opt.id,
          name: opt.name,
          price: opt.price.toNumber(),
          addOnId: opt.addOn.id,
          addOnName: opt.addOn.name,
        },
      ])
    );

    // Enrich cart items with detailed variation and add-on information
    const enrichedItems = cart.items.map((item) => {
      const basePrice = item.menuItem.price.toNumber();
      let unitPrice = basePrice;
      
      // Process variations
      let enrichedVariations: Array<{
        variationId: string;
        variationName: string;
        selectedOptionId: string;
        optionName: string;
        priceModifier: number;
      }> = [];

      if (item.selectedVariations) {
        const variations = item.selectedVariations as Array<{ variationId: string; selectedOptionId: string }>;
        enrichedVariations = variations.map((v) => {
          const optionData = variationOptionMap.get(v.selectedOptionId);
          if (optionData) {
            unitPrice += optionData.priceModifier;
            return {
              variationId: v.variationId,
              variationName: optionData.variationName,
              selectedOptionId: v.selectedOptionId,
              optionName: optionData.name,
              priceModifier: optionData.priceModifier,
            };
          }
          return {
            variationId: v.variationId,
            variationName: "Unknown",
            selectedOptionId: v.selectedOptionId,
            optionName: "Unknown",
            priceModifier: 0,
          };
        });
      }

      // Process add-ons
      let enrichedAddOns: Array<{
        addOnId: string;
        addOnName: string;
        options: Array<{
          id: string;
          name: string;
          price: number;
        }>;
      }> = [];

      if (item.selectedAddOns) {
        const addOns = item.selectedAddOns as Array<{ addOnId: string; selectedOptionIds: string[] }>;
        
        // Group options by add-on
        const addOnGroups = new Map<string, { addOnName: string; options: Array<{ id: string; name: string; price: number }> }>();
        
        addOns.forEach((addOn) => {
          addOn.selectedOptionIds.forEach((optionId) => {
            const optionData = addOnOptionMap.get(optionId);
            if (optionData) {
              unitPrice += optionData.price;
              
              if (!addOnGroups.has(addOn.addOnId)) {
                addOnGroups.set(addOn.addOnId, {
                  addOnName: optionData.addOnName,
                  options: [],
                });
              }
              
              addOnGroups.get(addOn.addOnId)!.options.push({
                id: optionData.id,
                name: optionData.name,
                price: optionData.price,
              });
            }
          });
        });

        enrichedAddOns = Array.from(addOnGroups.entries()).map(([addOnId, data]) => ({
          addOnId,
          addOnName: data.addOnName,
          options: data.options,
        }));
      }

      const lineTotal = unitPrice * item.quantity;

      return {
        id: item.id,
        cartId: item.cartId,
        restaurantId: item.restaurantId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        specialNotes: item.specialNotes,
        selectedVariations: enrichedVariations,
        selectedAddOns: enrichedAddOns,
        unitPrice,
        lineTotal,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        menuItem: {
          id: item.menuItem.id,
          name: item.menuItem.name,
          description: item.menuItem.description,
          price: basePrice,
          image: item.menuItem.image,
          preparationTime: item.menuItem.preparationTime,
          category: item.menuItem.category,
        },
        restaurant: item.restaurant,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      items: enrichedItems,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  },

  // Calculate item price including variations and add-ons
  async calculateItemPrice(
    menuItemId: string,
    selectedVariations?: Array<{ variationId: string; selectedOptionId: string }>,
    selectedAddOns?: Array<{ addOnId: string; selectedOptionIds: string[] }>
  ): Promise<number> {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    let totalPrice = menuItem.price.toNumber();

    // Add variation option prices
    if (selectedVariations && selectedVariations.length > 0) {
      for (const variation of selectedVariations) {
        const option = await prisma.variationOption.findUnique({
          where: { id: variation.selectedOptionId },
        });
        if (option) {
          totalPrice += option.priceModifier.toNumber();
        }
      }
    }

    // Add add-on option prices
    if (selectedAddOns && selectedAddOns.length > 0) {
      for (const addOn of selectedAddOns) {
        for (const optionId of addOn.selectedOptionIds) {
          const option = await prisma.addOnOption.findUnique({
            where: { id: optionId },
          });
          if (option) {
            totalPrice += option.price.toNumber();
          }
        }
      }
    }

    return totalPrice;
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

    // Find all items with the same menuItemId in this cart
    const existingItems = await prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
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
        return await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + data.quantity,
            ...(data.specialNotes && { specialNotes: data.specialNotes }),
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
      }
    }

    // Create new cart item with variations and add-ons
    return await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: data.menuItemId,
        restaurantId: data.restaurantId,
        quantity: data.quantity,
        specialNotes: data.specialNotes || null,
        selectedVariations: data.selectedVariations ? (data.selectedVariations as any) : null,
        selectedAddOns: data.selectedAddOns ? (data.selectedAddOns as any) : null,
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
    // Just delegate to getCart since it already returns enriched data
    return await this.getCart(userId);
  },
};
