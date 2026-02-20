import prisma from "../../config/prisma";

export const trackOrderService = {
  // Get order tracking information
  async getOrderTrackingInfo(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        specialInstructions: true,
        createdAt: true,
        restaurant: {
          select: {
            userId: true,
            name: true,
            location: true,
          },
        },
        items: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            menuItem: {
              select: {
                image: true,
              },
            },
          },
        },
        deliveryAddress: {
          select: {
            address: true,
            city: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Define status progression steps
    const statusSteps = [
      { status: "PENDING", label: "Order placed", time: order.createdAt },
      { status: "ACCEPTED", label: "Accepted", time: null },
      { status: "PREPARING", label: "Preparing", time: null },
      { status: "READY", label: "Ready", time: null },
      { status: "OUT_FOR_DELIVERY", label: "Out for delivery", time: null },
      { status: "DELIVERED", label: "Delivered", time: order.actualDeliveryTime },
    ];

    // Mark which steps are completed
    const completedSteps = statusSteps.map((step) => ({
      ...step,
      isCompleted: isStatusCompleted(step.status, order.status),
      isActive: step.status === order.status,
    }));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime,
      specialInstructions: order.specialInstructions,
      restaurant: {
        id: order.restaurant.userId,
        name: order.restaurant.name,
        location: order.restaurant.location,
      },
      deliveryAddress: {
        address: order.deliveryAddress.address,
        city: order.deliveryAddress.city,
      },
      items: order.items.map((item) => ({
        id: item.id,
        name: item.itemName,
        quantity: item.quantity,
        image: item.menuItem.image,
      })),
      statusTimeline: completedSteps,
    };
  },

  // Get simplified tracking status
  async getOrderStatus(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  },
};

// Helper function to determine if status is completed
function isStatusCompleted(stepStatus: string, currentStatus: string): boolean {
  const statusOrder = ["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
  const stepIndex = statusOrder.indexOf(stepStatus);
  const currentIndex = statusOrder.indexOf(currentStatus);

  return stepIndex <= currentIndex && currentStatus !== "CANCELLED";
}
