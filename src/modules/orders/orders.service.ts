import prisma from "../../config/prisma";
import { CancelOrderInput, ReorderInput, GetAcceptedOrdersInput } from "./orders.schema";
import {
  notifyUserOrderStatus,
  notifyRestaurantAndAdminNewOrder,
  notifyRestaurantAndAdminCancelled,
} from "../notifications/notification.service";


export const ordersService = {
  /**
   * Get all orders for a user with optional filtering
   */
  async getUserOrders(userId: string, status?: string, limit: number = 10, offset: number = 0) {
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        restaurant: {
          select: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
            banner: true,
            cuisineCategoryId: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        deliveryAddress: {
          select: {
            label: true,
            address: true,
          },
        },
        orderGroup: {
          select: { id: true, groupNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({ where });

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderGroupId: order.orderGroupId,
        groupNumber: order.orderGroup?.groupNumber ?? null,
        restaurantName: order.restaurant.user.name,
        restaurantImage: order.restaurant.banner,
        totalAmount: Number.parseFloat(order.total.toString()),
        status: order.status,
        date: order.createdAt,
        items: order.items.map((item: any) => ({
          id: item.id,
          name: item.itemName,
          quantity: item.quantity,
          image: item.menuItem.image,
        })),
        itemCount: order.items.length,
      })),
      total,
      limit,
      offset,
    };
  },

  /**
   * Get active orders (PENDING, ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY)
   */
  async getActiveOrders(userId: string, limit: number = 10, offset: number = 0) {
    const statuses: any[] = ["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
    const where = {
      userId,
      status: {
        in: statuses,
      },
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        restaurant: {
          select: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
            banner: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        orderGroup: {
          select: { id: true, groupNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({ where });

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderGroupId: order.orderGroupId,
        groupNumber: order.orderGroup?.groupNumber ?? null,
        restaurantName: order.restaurant.user.name,
        restaurantImage: order.restaurant.banner,
        totalAmount: Number.parseFloat(order.total.toString()),
        status: order.status,
        date: order.createdAt,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        items: order.items.slice(0, 3).map((item: any) => ({
          id: item.id,
          name: item.itemName,
          quantity: item.quantity,
          image: item.menuItem.image,
        })),
        itemCount: order.items.length,
      })),
      total,
      limit,
      offset,
    };
  },

  /**
   * Get past orders (DELIVERED or CANCELLED)
   */
  async getPastOrders(userId: string, limit: number = 10, offset: number = 0) {
    const statuses: any[] = ["DELIVERED", "CANCELLED"];
    const where = {
      userId,
      status: {
        in: statuses,
      },
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        restaurant: {
          select: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
            banner: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        orderGroup: {
          select: { id: true, groupNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({ where });

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderGroupId: order.orderGroupId,
        groupNumber: order.orderGroup?.groupNumber ?? null,
        restaurantName: order.restaurant.user.name,
        restaurantImage: order.restaurant.banner,
        totalAmount: Number.parseFloat(order.total.toString()),
        status: order.status,
        date: order.createdAt,
        items: order.items.slice(0, 3).map((item: any) => ({
          id: item.id,
          name: item.itemName,
          quantity: item.quantity,
          image: item.menuItem.image,
        })),
        itemCount: order.items.length,
      })),
      total,
      limit,
      offset,
    };
  },

  /**
   * Cancel an order with reason
   */
  async cancelOrder(input: CancelOrderInput, authUserId: string) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the authenticated user (not the request body)
    if (order.userId !== authUserId) {
      throw new Error("Unauthorized: This order does not belong to you");
    }

    // Only allow cancellation if order is not already delivered or cancelled
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new Error(`Order cannot be cancelled. Current status: ${order.status}`);
    }

    // Prevent cancellation if order has been accepted by restaurant
    if (["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(order.status)) {
      throw new Error(`Order cannot be cancelled after it has been accepted by the restaurant. Current status: ${order.status}`);
    }


    // Update order status to CANCELLED
    const updatedOrder = await prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: "CANCELLED",
        specialInstructions: `Cancellation reason: ${input.reason}`,
      },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            expoPushToken: true,
          },
        },
        restaurant: {
          include: {
            user: {
              select: {
                id: true,
                expoPushToken: true,
              },
            },
          },
        },
      },
    });

    // Notify user about order cancellation
    try {
      await notifyUserOrderStatus(updatedOrder);
    } catch (error: any) {}

    // Notify restaurant and admin about order cancellation
    try {
      await notifyRestaurantAndAdminCancelled(updatedOrder);
    } catch (error: any) {}

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      reason: input.reason,
      message: "Order cancelled successfully",
    };
  },

  /**
   * Reorder items from a past order - adds items to user's cart
   */
  async reorderFromPastOrder(input: ReorderInput, authUserId: string) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the authenticated user (not the request body)
    if (order.userId !== authUserId) {
      throw new Error("Unauthorized: This order does not belong to you");
    }

    // Only allow reordering from completed orders
    if (order.status !== "DELIVERED" && order.status !== "CANCELLED") {
      throw new Error("You can only reorder from completed or cancelled orders");
    }

    // Check if user has a cart
    let cart = await prisma.cart.findUnique({
      where: { userId: authUserId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: authUserId },
      });
    }

    // Check if items are from the same restaurant
    const restaurantId = order.restaurantId;

    // Add items to cart
    const cartItems = await Promise.all(
      order.items.map((item: any) =>
        prisma.cartItem.create({
          data: {
            cartId: cart.id,
            restaurantId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            specialNotes: item.specialNotes,
            selectedVariations: item.selectedVariations,
            selectedAddOns: item.selectedAddOns,
          },
          include: {
            menuItem: true,
          },
        })
      )
    );

    return {
      cartId: cart.id,
      itemsAdded: cartItems.length,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
      })),
    };
  },

  // /**
  //  * Get common cancellation reasons
  //  * Returns 5 options: 4 predefined reasons + "Other" for custom input
  //  */
  async getCancellationReasons() {
    return {
      reasons: [
        {
          id: "1",
          label: "Incorrect order details",
          value: "Incorrect order details",
        },
        {
          id: "2",
          label: "Restaurant taking too long",
          value: "Restaurant taking too long",
        },
        {

          label: "Other",
          value: "Other",
          isTextInput: true, // Indicates custom text input needed
        },
      ],
    };
  },

  /**
   * Get single order summary for reorder preview
   */
  async getOrderForReorder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        restaurant: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the user
    if (order.userId !== userId) {
      throw new Error("Unauthorized: This order does not belong to you");
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      restaurantName: order.restaurant.user.name,
      items: order.items.map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.itemName,
        quantity: item.quantity,
        price: Number.parseFloat(item.unitPrice.toString()),
        image: item.menuItem.image,
      })),
      total: Number.parseFloat(order.total.toString()),
    };
  },

  /**
   * Get detailed information about a specific order.
   * `requester` is the authenticated principal — restricts the row by either
   * matching userId (USER role) or restaurantId (RESTAURANT role). ADMIN sees all.
   */
  async getOrderDetails(orderId: string, requester?: { id: string; role: string }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
          },
        },
        restaurant: {
          include: {
            user: true,
            mall: true,
          },
        },
        deliveryAddress: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            image: true,
          },
        },
        orderGroup: {
          select: {
            id: true,
            groupNumber: true,
            _count: { select: { orders: true } },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Authorization: only the order owner, the receiving restaurant, or an admin
    if (requester) {
      const role = String(requester.role).toUpperCase();
      const isAdmin = role === "ADMIN";
      const isOwner = role === "USER" && order.userId === requester.id;
      const isRestaurant = role === "RESTAURANT" && order.restaurantId === requester.id;
      if (!isAdmin && !isOwner && !isRestaurant) {
        throw new Error("Order not found");
      }
    }

    // Format the response for the frontend
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      specialInstructions: order.specialInstructions,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // GAP-007: combined-order context (null for legacy/standalone orders)
      orderGroup: order.orderGroup
        ? {
            id: order.orderGroup.id,
            groupNumber: order.orderGroup.groupNumber,
            orderCount: order.orderGroup._count.orders,
          }
        : null,
      user: {
        id: order.user.id,
        name: `${order.user.firstName} ${order.user.lastName}`,
        email: order.user.email,
        phone: order.user.phoneNumber,
        image: order.user.image,
      },
      restaurant: {
        id: order.restaurant.userId,
        name: order.restaurant.user.name,
        banner: order.restaurant.banner,
        description: order.restaurant.description,
        location: order.restaurant.location,
        mall: {
          id: order.restaurant.mall.id,
          name: order.restaurant.mall.name,
        },
      },
      deliveryAddress: {
        label: order.deliveryAddress.label,
        address: order.deliveryAddress.address,
        city: order.deliveryAddress.city,
      },
      items: order.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        totalPrice: parseFloat(item.totalPrice.toString()),
        specialNotes: item.specialNotes,
        image: item.menuItem.image,
      })),
      pricing: {
        subtotal: parseFloat(order.subtotal.toString()),
        tax: parseFloat(order.tax.toString()),
        deliveryFee: parseFloat(order.deliveryFee.toString()),
        discount: parseFloat(order.discount.toString()),
        total: parseFloat(order.total.toString()),
      },
    };
  },

  /**
   * GAP-007 — Combined order view: the group and all its child orders (one
   * per restaurant), each with its own status and pricing. Owner-only:
   * cross-user access reads as "not found".
   */
  async getOrderGroup(groupId: string, authUserId: string) {
    const group = await prisma.orderGroup.findUnique({
      where: { id: groupId },
      include: {
        deliveryAddress: {
          select: { label: true, address: true, city: true },
        },
        orders: {
          orderBy: { orderNumber: "asc" },
          include: {
            restaurant: {
              select: {
                userId: true,
                name: true,
                banner: true,
              },
            },
            items: {
              include: {
                menuItem: { select: { image: true } },
              },
            },
          },
        },
      },
    });

    if (!group || group.userId !== authUserId) {
      throw new Error("Order group not found");
    }

    const orders = group.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      restaurant: {
        id: order.restaurant.userId,
        name: order.restaurant.name,
        banner: order.restaurant.banner,
      },
      items: order.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        totalPrice: parseFloat(item.totalPrice.toString()),
        image: item.menuItem.image,
      })),
      pricing: {
        subtotal: parseFloat(order.subtotal.toString()),
        tax: parseFloat(order.tax.toString()),
        deliveryFee: parseFloat(order.deliveryFee.toString()),
        discount: parseFloat(order.discount.toString()),
        total: parseFloat(order.total.toString()),
      },
    }));

    const grandTotal =
      Math.round(orders.reduce((sum, o) => sum + o.pricing.total, 0) * 100) / 100;

    return {
      id: group.id,
      groupNumber: group.groupNumber,
      createdAt: group.createdAt,
      specialInstructions: group.specialInstructions,
      deliveryAddress: group.deliveryAddress,
      grandTotal,
      orders,
    };
  },

  // /**
  //  * Get order summary information (quick view)
  //  */
  async getOrderSummary(orderId: string, requester?: { id: string; role: string }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        restaurantId: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
        estimatedDeliveryTime: true,
        restaurant: {
          select: {
            userId: true,
            name: true,
            mainCategory: true,
            banner: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (requester) {
      const role = String(requester.role).toUpperCase();
      const isAdmin = role === "ADMIN";
      const isOwner = role === "USER" && order.userId === requester.id;
      const isRestaurant = role === "RESTAURANT" && order.restaurantId === requester.id;
      if (!isAdmin && !isOwner && !isRestaurant) {
        throw new Error("Order not found");
      }
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      restaurantName: order.restaurant.user.name,
      itemCount: order.items.length,
      total: parseFloat(order.total.toString()),
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
    };
  },

  // /**
  //  * Get accepted orders (order queue) for restaurant
  //  */
  async getAcceptedOrders(input: GetAcceptedOrdersInput) {
    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: input.restaurantId },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const where: any = {
      restaurantId: input.restaurantId,
      status: "ACCEPTED" as const,
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            image: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        deliveryAddress: {
          select: {
            label: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "asc" }, // Oldest first for queue
      take: input.limit || 50,
      skip: input.offset || 0,
    });

    const total = await prisma.order.count({ where });

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.user.name,
        customerPhone: order.user.phoneNumber,
        customerImage: order.user.image,
        status: order.status,
        totalAmount: Number.parseFloat(order.total.toString()),
        subtotal: Number.parseFloat(order.subtotal.toString()),
        tax: Number.parseFloat(order.tax.toString()),
        deliveryFee: Number.parseFloat(order.deliveryFee.toString()),
        discount: Number.parseFloat(order.discount.toString()),
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress?.address || "N/A",
        deliveryCity: order.deliveryAddress?.city || "N/A",
        deliveryLabel: order.deliveryAddress?.label || "N/A",
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        specialInstructions: order.specialInstructions,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: Number.parseFloat(item.unitPrice.toString()),
          totalPrice: Number.parseFloat(item.totalPrice.toString()),
          image: item.menuItem.image,
          specialNotes: item.specialNotes,
        })),
        itemCount: order.items.length,
      })),
      total,
      limit: input.limit || 50,
      offset: input.offset || 0,
    };
  },
};

