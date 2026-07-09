import prisma from "../../config/prisma";
import { notifyRestaurantAndAdminNewOrder } from "../notifications/notification.service";
import { CheckoutInput, UpdateOrderStatusInput } from "./checkout.schema";
import {
  round2,
  generateGroupNumber,
  deriveChildOrderNumbers,
  computeDiscount,
} from "./checkout.helpers";

// Hydrated shape returned for each created order — extracted from the old
// inline select so every child order in a group is hydrated identically.
// MUST keep restaurant.user.expoPushToken: notifyRestaurantAndAdminNewOrder
// reads it (BUG-021).
const CREATED_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  orderGroupId: true,
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
      user: {
        select: {
          id: true,
          expoPushToken: true,
        },
      },
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
} as const;

export const checkoutService = {
  // Create order from cart. userId comes from the authenticated session,
  // not the request body — controller passes it explicitly.
  async createOrder(checkoutData: CheckoutInput, userId: string) {
    const { deliveryAddressId, paymentMethod, specialInstructions, promoCodeId, deliveryFee, tax } =
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

    // GAP-007 — Multiple Orders, Single Checkout. The cart may span several
    // restaurants of the same mall: one checkout creates one OrderGroup and
    // one child Order per restaurant. Group the items by restaurant.
    const itemsByRestaurant = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      if (!item.restaurantId) {
        throw new Error("Invalid restaurant ID");
      }
      const group = itemsByRestaurant.get(item.restaurantId);
      if (group) {
        group.push(item);
      } else {
        itemsByRestaurant.set(item.restaurantId, [item]);
      }
    }
    const restaurantIds = Array.from(itemsByRestaurant.keys());

    // --- BUSINESS HOURS CHECK (all restaurants up front, all-or-nothing) ---
    // If ANY restaurant in the cart is closed, the whole checkout fails with
    // a message naming it — no partial order creation.
    const businessDays = await prisma.businessDay.findMany({
      where: { restaurantId: { in: restaurantIds } },
      include: { timeSlots: true },
    });

    // Day-of-week and HH:MM must be computed in Asia/Muscat regardless of the
    // server's local TZ — otherwise a UTC server checks Saturday's hours at
    // 22:00 Sunday Oman time, and every order looks "closed".
    const omanFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Muscat",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = omanFmt.formatToParts(new Date());
    const today = (parts.find((p) => p.type === "weekday")?.value || "").toUpperCase();
    const hourRaw = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    // Some ICU builds emit "24" at midnight; normalize to "00".
    const hour = hourRaw === "24" ? "00" : hourRaw;
    const currentTime = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

    for (const rid of restaurantIds) {
      // Restaurant name for a clear error message (cart items carry the
      // restaurant relation).
      const restaurantName =
        itemsByRestaurant.get(rid)?.[0]?.restaurant?.name || "A restaurant in your cart";

      const todayBusiness = businessDays.find(
        (d: any) => d.restaurantId === rid && d.day === today,
      );
      if (!todayBusiness || todayBusiness.isClosed) {
        throw new Error(
          `${restaurantName} is closed today. Please remove its items or try again later.`,
        );
      }

      const isOpen = (todayBusiness.timeSlots || []).some((slot: any) => {
        if (slot.slotType !== "OPEN") return false;
        return slot.openTime <= currentTime && currentTime < slot.closeTime;
      });
      if (!isOpen) {
        throw new Error(
          `${restaurantName} is currently closed. Please remove its items or try again later.`,
        );
      }
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

    // Per-item unit price incl. variations/add-ons (using the cached maps).
    const priceCartItem = (item: (typeof cart.items)[number]) => {
      let itemUnitPrice = item.menuItem.price.toNumber();

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

      return itemUnitPrice;
    };

    // Promo code (user-entered) — fetched once; it belongs to exactly one
    // restaurant (PromoCode.restaurantId is required) and only discounts
    // that restaurant's child order.
    let promoPct: number | null = null;
    let promoRestaurantId: string | null = null;
    if (promoCodeId) {
      const promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      });
      if (promoCode) {
        const now = new Date();
        if (promoCode.startDate <= now && promoCode.endDate >= now) {
          promoPct = promoCode.discountPercentage;
          promoRestaurantId = promoCode.restaurantId;
        }
      }
    }

    // Live "Deal of the day" Promotions for ALL cart restaurants in one
    // query; per restaurant we use the highest live percentage.
    const nowForPromo = new Date();
    const livePromotions = await prisma.promotion.findMany({
      where: {
        restaurantId: { in: restaurantIds },
        isActive: true,
        startDate: { lte: nowForPromo },
        endDate: { gte: nowForPromo },
      },
      select: { restaurantId: true, discountPercentage: true },
    });
    const topPromotionPctByRestaurant = new Map<string, number>();
    for (const promo of livePromotions) {
      const pct = Number(promo.discountPercentage);
      const current = topPromotionPctByRestaurant.get(promo.restaurantId) ?? 0;
      if (pct > current) topPromotionPctByRestaurant.set(promo.restaurantId, pct);
    }

    // Build each child order's data. Per the locked business rules:
    // deliveryFee and tax from the payload apply PER RESTAURANT (each
    // restaurant delivers separately); the discount is the larger of the
    // matching promo code and the restaurant's own live promotion.
    const childOrderData = restaurantIds.map((rid) => {
      const items = itemsByRestaurant.get(rid)!;

      let subtotal = 0;
      const orderItemsData = items.map((item) => {
        const itemUnitPrice = priceCartItem(item);
        const itemTotal = itemUnitPrice * item.quantity;
        subtotal += itemTotal;
        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: itemUnitPrice.toString(),
          totalPrice: itemTotal.toString(),
          itemName: item.menuItem.name,
          specialNotes: item.specialNotes,
          selectedVariations: item.selectedVariations ? (item.selectedVariations as any) : null,
          selectedAddOns: item.selectedAddOns ? (item.selectedAddOns as any) : null,
        };
      });
      subtotal = round2(subtotal);

      const promoMatches = promoRestaurantId === rid;
      const discount = computeDiscount(
        subtotal,
        promoMatches ? promoPct : null,
        topPromotionPctByRestaurant.get(rid) ?? null,
      );
      const total = round2(subtotal + tax + deliveryFee - discount);

      return {
        restaurantId: rid,
        orderItemsData,
        subtotal,
        discount,
        total,
        // Link the promo code only to the child it actually discounted.
        promoCodeId: promoMatches && promoPct !== null ? promoCodeId! : null,
      };
    });

    // Create the group + all child orders + clear the cart atomically.
    // Retry up to 3 times on the (unlikely) group/order-number unique
    // collision — the DB constraints are the backstop.
    let createdOrders: any[] = [];
    let orderGroup: { id: string; groupNumber: string } | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const groupNumber = generateGroupNumber();
      const childOrderNumbers = deriveChildOrderNumbers(groupNumber, childOrderData.length);

      try {
        const result = await prisma.$transaction(async (tx) => {
          const group = await tx.orderGroup.create({
            data: {
              groupNumber,
              userId,
              deliveryAddressId,
              specialInstructions: specialInstructions || null,
            },
          });

          const created = [];
          for (const [i, child] of childOrderData.entries()) {
            created.push(
              await tx.order.create({
                data: {
                  orderNumber: childOrderNumbers[i]!,
                  orderGroupId: group.id,
                  userId,
                  restaurantId: child.restaurantId,
                  deliveryAddressId,
                  paymentMethod,
                  specialInstructions: specialInstructions || null,
                  promoCodeId: child.promoCodeId,
                  subtotal: child.subtotal.toString(),
                  tax: tax.toString(),
                  deliveryFee: deliveryFee.toString(),
                  discount: child.discount.toString(),
                  total: child.total.toString(),
                  status: "PENDING",
                  items: {
                    create: child.orderItemsData,
                  },
                },
                select: CREATED_ORDER_SELECT,
              }),
            );
          }

          // Checkout consumes the entire cart.
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id },
          });

          return { group, created };
        },
        // Many-restaurant carts do N sequential order creates — give the
        // interactive transaction headroom over the 5s default.
        { timeout: 15000 });

        orderGroup = result.group;
        createdOrders = result.created;
        break;
      } catch (error: any) {
        // P2002 = unique constraint violation (orderNumber/groupNumber clash)
        if (error?.code === "P2002" && attempt < 3) {
          continue;
        }
        throw error;
      }
    }

    if (!orderGroup || createdOrders.length === 0) {
      throw new Error("Failed to create order. Please try again.");
    }

    // Notify each restaurant (and admins) about its own new order. One
    // failed push must not affect the others or the checkout response.
    for (const order of createdOrders) {
      try {
        await notifyRestaurantAndAdminNewOrder(order);
      } catch (error: any) {
        console.error("[Checkout] Failed to send new order notification:", error.message);
      }
    }

    const grandTotal = round2(
      createdOrders.reduce((sum, order) => sum + Number(order.total), 0),
    );

    // Backward-compatible response (GAP-007): the first child order is
    // spread at the top level so existing clients that read data.id /
    // data.orderNumber / data.total keep working; new clients read the
    // group fields + orders[].
    return {
      ...createdOrders[0],
      orderGroupId: orderGroup.id,
      groupNumber: orderGroup.groupNumber,
      grandTotal,
      orders: createdOrders,
    };
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

    // GAP-007: carts may span multiple restaurants — the summary groups
    // per restaurant instead of rejecting.

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
          subtotal: 0,
          items: [],
        };
      }

      itemsByRestaurant[restaurantId].subtotal = round2(
        itemsByRestaurant[restaurantId].subtotal + itemTotal,
      );
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

    const restaurantGroups = Object.values(itemsByRestaurant);

    return {
      subtotal: round2(subtotal),
      restaurantCount: restaurantGroups.length,
      itemsByRestaurant: restaurantGroups,
      addresses,
      cartItemCount: cart.items.length,
    };
  },
};
