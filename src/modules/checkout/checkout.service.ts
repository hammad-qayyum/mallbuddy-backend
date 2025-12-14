import prisma from "../../config/prisma";
import { CheckoutInput, UpdateOrderStatusInput } from "./checkout.schema";

export const checkoutService = {
  // Create order from cart
  async createOrder(checkoutData: CheckoutInput) {
    const { userId, deliveryAddressId, paymentMethod, specialInstructions, appliedDiscount, deliveryFee, tax } =
      checkoutData;

    // Get user's cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            menuItem: true,
            restaurant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Verify delivery address exists
    const deliveryAddress = await prisma.deliveryAddress.findUnique({
      where: { id: deliveryAddressId },
    });

    if (!deliveryAddress) {
      throw new Error("Delivery address not found");
    }

    if (deliveryAddress.userId !== userId) {
      throw new Error("Delivery address does not belong to this user");
    }

    // Check if all items are from the same restaurant
    const restaurantIds = new Set(cart.items.map((item) => item.restaurantId));
    if (restaurantIds.size > 1) {
      throw new Error("All items in cart must be from the same restaurant");
    }

    const restaurantId = Array.from(restaurantIds)[0];
    if (!restaurantId) {
      throw new Error("Invalid restaurant ID");
    }

    // Calculate subtotal from cart items including variations and add-ons
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      let itemUnitPrice = item.menuItem.price.toNumber();

      // Add variation option prices
      if (item.selectedVariations) {
        const variations = item.selectedVariations as Array<{
          variationId: string;
          selectedOptionId: string;
        }>;
        for (const variation of variations) {
          const option = await prisma.variationOption.findUnique({
            where: { id: variation.selectedOptionId },
          });
          if (option) {
            itemUnitPrice += option.priceModifier.toNumber();
          }
        }
      }

      // Add add-on option prices
      if (item.selectedAddOns) {
        const addOns = item.selectedAddOns as Array<{
          addOnId: string;
          selectedOptionIds: string[];
        }>;
        for (const addOn of addOns) {
          for (const optionId of addOn.selectedOptionIds) {
            const option = await prisma.addOnOption.findUnique({
              where: { id: optionId },
            });
            if (option) {
              itemUnitPrice += option.price.toNumber();
            }
          }
        }
      }

      const itemTotal = itemUnitPrice * item.quantity;
      subtotal += itemTotal;

      // Prepare order item data with variations and add-ons
      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: itemUnitPrice.toString(),
        totalPrice: itemTotal.toString(),
        itemName: item.menuItem.name,
        specialNotes: item.specialNotes,
        selectedVariations: item.selectedVariations ? (item.selectedVariations as any) : null,
        selectedAddOns: item.selectedAddOns ? (item.selectedAddOns as any) : null,
      });
    }

    const total = subtotal + tax + deliveryFee - appliedDiscount;

    // Generate unique order number
    const orderNumber = "#" + Date.now().toString().slice(-4) + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        restaurantId: restaurantId,
        deliveryAddressId,
        paymentMethod,
        specialInstructions: specialInstructions || null,
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        deliveryFee: deliveryFee.toString(),
        discount: appliedDiscount.toString(),
        total: total.toString(),
        status: "PENDING",
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: {
          include: { user: true },
        },
        deliveryAddress: true,
        user: true,
      },
    });

    // Clear the cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return order;
  },

  // Get order by ID
  async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: {
          include: { user: true },
        },
        deliveryAddress: true,
        user: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  },

  // Get user's orders
  async getUserOrders(userId: string, status?: string, limit: number = 10, offset: number = 0) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: {
          include: { user: true },
        },
        deliveryAddress: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({ where });

    return { orders, total, limit, offset };
  },

  // Update order status
  async updateOrderStatus(orderId: string, updateData: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const updatePayload: any = {
      status: updateData.status,
      estimatedDeliveryTime: updateData.estimatedDeliveryTime || order.estimatedDeliveryTime,
    };

    // Only include actualDeliveryTime if status is DELIVERED
    if (updateData.status === "DELIVERED") {
      updatePayload.actualDeliveryTime = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updatePayload,
      include: {
        items: {
          include: { menuItem: true },
        },
        restaurant: {
          include: { user: true },
        },
        deliveryAddress: true,
        user: true,
      },
    });

    return updatedOrder;
  },

  // Get saved delivery addresses for user
  async getUserDeliveryAddresses(userId: string) {
    const addresses = await prisma.deliveryAddress.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return addresses;
  },

  // Add delivery address
  async addDeliveryAddress(
    userId: string,
    data: { label?: string; address: string; city?: string; postalCode?: string; isDefault?: boolean },
  ) {
    // If this is marked as default, unset other defaults
    if (data.isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.deliveryAddress.create({
      data: {
        userId,
        ...data,
      },
    });

    return address;
  },

  // Get order summary (for checkout page)
  async getCheckoutSummary(userId: string) {
    const cart = await prisma.cart.findUnique({
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

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Check if all items are from same restaurant
    const restaurantIds = new Set(cart.items.map((item) => item.restaurantId));
    if (restaurantIds.size > 1) {
      throw new Error("All items must be from the same restaurant");
    }

    // Get delivery addresses
    const addresses = await prisma.deliveryAddress.findMany({
      where: { userId },
      orderBy: { isDefault: "desc" },
    });

    // Calculate summary including variations and add-ons
    let subtotal = 0;
    const itemsByRestaurant: any = {};

    for (const item of cart.items) {
      const restaurantId = item.restaurantId;
      let itemUnitPrice = item.menuItem.price.toNumber();

      // Add variation option prices
      if (item.selectedVariations) {
        const variations = item.selectedVariations as Array<{
          variationId: string;
          selectedOptionId: string;
        }>;
        for (const variation of variations) {
          const option = await prisma.variationOption.findUnique({
            where: { id: variation.selectedOptionId },
          });
          if (option) {
            itemUnitPrice += option.priceModifier.toNumber();
          }
        }
      }

      // Add add-on option prices
      if (item.selectedAddOns) {
        const addOns = item.selectedAddOns as Array<{
          addOnId: string;
          selectedOptionIds: string[];
        }>;
        for (const addOn of addOns) {
          for (const optionId of addOn.selectedOptionIds) {
            const option = await prisma.addOnOption.findUnique({
              where: { id: optionId },
            });
            if (option) {
              itemUnitPrice += option.price.toNumber();
            }
          }
        }
      }

      const itemTotal = itemUnitPrice * item.quantity;
      subtotal += itemTotal;

      if (!itemsByRestaurant[restaurantId]) {
        itemsByRestaurant[restaurantId] = {
          restaurantId,
          restaurantName: item.restaurant.user?.name || "Restaurant",
          items: [],
        };
      }

      itemsByRestaurant[restaurantId].items.push({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: itemUnitPrice,
        total: itemTotal,
        specialNotes: item.specialNotes,
        selectedVariations: item.selectedVariations,
        selectedAddOns: item.selectedAddOns,
      });
    }

    return {
      subtotal,
      itemsByRestaurant: Object.values(itemsByRestaurant),
      addresses,
      cartItemCount: cart.items.length,
    };
  },
};
