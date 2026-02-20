import prisma from "../../config/prisma";

export const orderDetailService = {
  // Get detailed information about a specific order
  async getOrderDetails(orderId: string) {
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
      },
    });

    if (!order) {
      throw new Error("Order not found");
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

  // Get all orders for a user with pagination
  async getUserOrdersList(userId: string, status?: string, limit: number = 10, offset: number = 0) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        restaurant: {
          include: { user: true },
        },
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.order.count({ where });

    // Format response
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      restaurantName: order.restaurant.user.name,
      itemCount: order.items.length,
      total: parseFloat(order.total.toString()),
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
    }));

    return {
      orders: formattedOrders,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  },

  // Get order summary information (quick view)
  async getOrderSummary(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: { user: true },
        },
        items: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
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
};
