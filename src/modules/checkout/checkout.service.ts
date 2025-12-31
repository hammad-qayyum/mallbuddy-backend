import prisma from "../../config/prisma";
import { notifyRestaurantAndAdminNewOrder } from "../notifications/notification.service";
import { CheckoutInput, UpdateOrderStatusInput } from "./checkout.schema";

export const checkoutService = {
  // Create order from cart
  async createOrder(checkoutData: CheckoutInput) {
    const { userId, deliveryAddressId, paymentMethod, specialInstructions, promoCodeId, deliveryFee, tax } =
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

    // Calculate subtotal from cart items including variations and add-ons
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      let itemUnitPrice = item.menuItem.price.toNumber();

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

  
     // Calculate discount if promo code is provided
     let appliedDiscount = 0;
     if (promoCodeId) {
       const promoCode = await prisma.promoCode.findUnique({
         where: { id: promoCodeId },
       });
 
       if (promoCode) {
         const now = new Date();
         // Verify promo code is valid
         if (promoCode.startDate <= now && promoCode.endDate >= now) {
           // Calculate discount based on percentage
           appliedDiscount = Math.round((subtotal * promoCode.discountPercentage) / 100 * 100) / 100;
         }
       }
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
        promoCodeId: promoCodeId || null, // Link promo code to order
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
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        restaurantId: true,
        deliveryAddressId: true,
        paymentMethod: true,
        specialInstructions: true,
        promoCodeId: true,
        subtotal: true,
        tax: true,
        deliveryFee: true,
        discount: true,
        total: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            orderId: true,
            menuItemId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            itemName: true,
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
            estimatedDeliveryTime: true,
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            label: true,
            address: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
          },
        },
      },
    });

    // Clear the cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Notify restaurant and admin about new order
    try {
      await notifyRestaurantAndAdminNewOrder(order);
    } catch (error: any) {
      console.error("[Checkout] Failed to send new order notification:", error.message);
      // Don't fail order creation if notification fails
    }

    return order;
  },

  // Get order by ID
  async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        restaurantId: true,
        deliveryAddressId: true,
        paymentMethod: true,
        specialInstructions: true,
        promoCodeId: true,
        subtotal: true,
        tax: true,
        deliveryFee: true,
        discount: true,
        total: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            orderId: true,
            menuItemId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            itemName: true,
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
            estimatedDeliveryTime: true,
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            label: true,
            address: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
          },
        },
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
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        restaurantId: true,
        deliveryAddressId: true,
        paymentMethod: true,
        specialInstructions: true,
        promoCodeId: true,
        subtotal: true,
        tax: true,
        deliveryFee: true,
        discount: true,
        total: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            orderId: true,
            menuItemId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            itemName: true,
            specialNotes: true,
            selectedVariations: true,
            selectedAddOns: true,
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
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
            estimatedDeliveryTime: true,
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            label: true,
            address: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
        },
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
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        restaurantId: true,
        deliveryAddressId: true,
        paymentMethod: true,
        specialInstructions: true,
        promoCodeId: true,
        subtotal: true,
        tax: true,
        deliveryFee: true,
        discount: true,
        total: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        paymentStatus: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            orderId: true,
            menuItemId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            itemName: true,
            specialNotes: true,
            selectedVariations: true,
            selectedAddOns: true,
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
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
            estimatedDeliveryTime: true,
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            label: true,
            address: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
          },
        },
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
      select: {
        id: true,
        items: {
          select: {
            id: true,
            restaurantId: true,
            menuItemId: true,
            quantity: true,
            specialNotes: true,
            selectedVariations: true,
            selectedAddOns: true,
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            restaurant: {
              select: {
                userId: true,
                name: true,
              },
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

    // Calculate summary including variations and add-ons
    let subtotal = 0;
    const itemsByRestaurant: any = {};

    for (const item of cart.items) {
      const restaurantId = item.restaurantId;
      let itemUnitPrice = item.menuItem.price.toNumber();

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
      subtotal += itemTotal;

      if (!itemsByRestaurant[restaurantId]) {
        itemsByRestaurant[restaurantId] = {
          restaurantId,
          restaurantName: item.restaurant.name || "Restaurant",
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
