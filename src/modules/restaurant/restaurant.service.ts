import prisma from "../../config/prisma";
import { deleteImageFile } from "../../config/upload";
import {
  UpdateRestaurantInput,
  AcceptOrderInput,
  DeclineOrderInput,
  UpdateOrderStatusInput,
  UpdatePaymentStatusInput,
  GetRestaurantOrdersInput,
  GetOrderDetailsInput,
} from "./restaurant.schema";
import { exploreService } from "../explore/explore.service";
import { galleryService } from "../gallery/gallery.service";
import {
  notifyUserOrderStatus,
  notifyRestaurantAndAdminCancelled,
} from "../notifications/notification.service";
import { activeSubscriptionWhere } from "./subscription/subscription.service";

function hasGalleryModel() {
  try {
    const m = (prisma as any).restaurantGallery;
    return !!(m && typeof m.findMany === "function");
  } catch (e) {
    return false;
  }
}

export const restaurantService = {
  // ============================
  // Existing CRUD
  // ============================


  async getAllRestaurants(
    mallId: string,
    category?: string,
    page: number = 1,
    limit: number = 10
  ) {
    // Customer-facing list — only show restaurants with an active, paid
    // subscription. Restaurants without one are hidden entirely (not just
    // un-orderable). Spread the helper into the where so the count() and
    // findMany() below see the same filter.
    const where: any = { mallId, ...activeSubscriptionWhere() };
    if (category) where.mainCategory = category;

    const total = await prisma.restaurant.count({ where });

    const data = await prisma.restaurant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { 
        user: true,
        mall: {
          select: {
            name: true
          }
        },
        subscriptions: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            plan: {
              select: {
                name: true
              }
            }
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
    });

    // Transform data to include restaurantId, membershipPlan, and mallName
    const transformedData = data.map(restaurant => ({
      ...restaurant,
      restaurantId: restaurant.userId,
      membershipPlan: restaurant.subscriptions[0]?.plan?.name || null,
      mallName: restaurant.mall?.name || null
    }));

    return { data: transformedData, total, page, limit };
  },

  // Get all restaurants system-wide (public access - no sensitive info).
  // Filters compose: any combo of mallId / cityId / countryId / category.
  // - mallId pins the direct mallId column on Restaurant
  // - cityId is enforced via the mall relation (mall.cityId)
  // - countryId is enforced via the mall -> city -> countryId chain
  // The admin restaurant management screen uses this endpoint as its default
  // listing, so no active-subscription filter is applied here — admins need
  // to see every restaurant (including pre-payment / past-due ones).
  async getAllRestaurantsSystemWidePublic(
    page: number = 1,
    limit: number = 10,
    mallId?: string,
    category?: string,
    cityId?: string,
    countryId?: string,
  ) {
    const where: any = {};
    if (mallId) where.mallId = mallId;
    if (category) where.mainCategory = category;
    if (cityId) where.mall = { ...(where.mall || {}), cityId };
    if (countryId)
      where.mall = { ...(where.mall || {}), city: { countryId } };

    const total = await prisma.restaurant.count({ where });

    const restaurants = await prisma.restaurant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            // Exclude email and phoneNumber for public access
          },
        },
        mall: {
          select: {
            id: true,
            name: true,
            address: true,
            cityId: true,
          },
        },
        cuisineCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptions: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            plan: {
              select: {
                name: true
              }
            }
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            orders: true,
            menuCategories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to public format (no sensitive info like revenue)
    const publicRestaurants = restaurants.map((restaurant) => ({
      restaurantId: restaurant.userId,
      userId: restaurant.userId,
      mallId: restaurant.mallId,
      mallName: restaurant.mall?.name || null,
      membershipPlan: restaurant.subscriptions[0]?.plan?.name || null,
      name: restaurant.name,
      mainCategory: restaurant.mainCategory,
      banner: restaurant.banner,
      description: restaurant.description,
      story: restaurant.story,
      location: restaurant.location,
      cuisineCategoryId: restaurant.cuisineCategoryId,
      cuisineCategory: restaurant.cuisineCategory
        ? {
            id: restaurant.cuisineCategory.id,
            name: restaurant.cuisineCategory.name,
          }
        : null,
      isFavorite: restaurant.isFavorite,
      user: {
        id: restaurant.user.id,
        name: restaurant.user.name,
        image: restaurant.user.image,
        // Exclude email and phoneNumber
      },
      mall: restaurant.mall
        ? {
            id: restaurant.mall.id,
            name: restaurant.mall.name,
            address: restaurant.mall.address,
            cityId: restaurant.mall.cityId,
          }
        : null,
      statistics: {
        totalOrders: restaurant._count.orders,
        totalMenuCategories: restaurant._count.menuCategories,
        // Exclude revenue for public access
      },
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    }));

    return {
      data: publicRestaurants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getRestaurantDetails(restaurantId: string) {
    // Customer reads the menu via this. Use findFirst with the active-sub
    // filter so a restaurant without a paid subscription returns null
    // (controller turns that into a 404), matching the "doesn't exist for
    // customers" contract used elsewhere.
    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: restaurantId, ...activeSubscriptionWhere() },
      include: {
        user: true,
        menuCategories: { include: { items: true } },
      },
    });

    if (!restaurant) return null;

    // fetch gallery images via Prisma client
      // fetch gallery images via Prisma client if available, otherwise fallback to raw SQL
      let galleryRows: { id: string; imageUrl: string }[] = [];
      if (hasGalleryModel()) {
        galleryRows = await (prisma as any).restaurantGallery.findMany({
          where: { restaurantId },
          select: { id: true, imageUrl: true },
          orderBy: { createdAt: "asc" },
        });
      } else {
        galleryRows = (await prisma.$queryRaw`
          SELECT "id", "imageUrl"
          FROM "RestaurantGallery"
          WHERE "restaurantId" = ${restaurantId}
          ORDER BY "createdAt" ASC
        `) as { id: string; imageUrl: string }[];
      }

      const gallery = galleryRows.map((g) => ({ id: g.id, imageUrl: g.imageUrl }));

    // return restaurant object with gallery property appended
    return {
      ...restaurant,
      gallery,
    };
  },

  async updateRestaurant(id: string, data: UpdateRestaurantInput) {
    const currentRestaurant = await prisma.restaurant.findUnique({
      where: { userId: id },
      select: { banner: true },
    });

    const restaurantUpdateData: any = {};
    const userUpdateData: any = {};

    // Only update fields that are provided and not empty
    if (data.mallId !== undefined && data.mallId !== null && data.mallId.trim() !== "") {
      restaurantUpdateData.mallId = data.mallId;
    }
    if (data.mainCategory !== undefined && data.mainCategory !== null && data.mainCategory.trim() !== "") {
      restaurantUpdateData.mainCategory = data.mainCategory;
    }
    if (data.name !== undefined && data.name !== null && data.name.trim() !== "") {
      restaurantUpdateData.name = data.name;
      userUpdateData.name = data.name;
    }
    if (data.story !== undefined && data.story !== null && data.story.trim() !== "") {
      restaurantUpdateData.story = data.story;
    }
    if (data.banner !== undefined && data.banner !== null && data.banner.trim() !== "") {
      // remove previous uploaded banner file if present
      if (currentRestaurant?.banner && currentRestaurant.banner.startsWith("/uploads/")) {
        try {
          deleteImageFile(currentRestaurant.banner);
        } catch (e) {
          // ignore file deletion errors
        }
      }
      restaurantUpdateData.banner = data.banner;
    }
    if (data.description !== undefined && data.description !== null && data.description.trim() !== "") {
      restaurantUpdateData.description = data.description;
    }
    if (data.location !== undefined && data.location !== null && data.location.trim() !== "") {
      restaurantUpdateData.location = data.location;
    }
    if (data.cuisineCategoryId !== undefined && data.cuisineCategoryId !== null && data.cuisineCategoryId.trim() !== "") {
      restaurantUpdateData.cuisineCategoryId = data.cuisineCategoryId;
    }
    if ((data as any).isFavorite !== undefined && (data as any).isFavorite !== null) {
      restaurantUpdateData.isFavorite = (data as any).isFavorite;
    }
    // Add more user fields as needed (e.g., phoneNumber, firstName, lastName)
    if ((data as any).phoneNumber !== undefined && (data as any).phoneNumber !== null && (data as any).phoneNumber.trim() !== "") {
      userUpdateData.phoneNumber = (data as any).phoneNumber;
    }
    if ((data as any).firstName !== undefined && (data as any).firstName !== null && (data as any).firstName.trim() !== "") {
      userUpdateData.firstName = (data as any).firstName;
    }
    if ((data as any).lastName !== undefined && (data as any).lastName !== null && (data as any).lastName.trim() !== "") {
      userUpdateData.lastName = (data as any).lastName;
    }

    // Update user if any user fields are present
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id },
        data: userUpdateData,
      });
    }

    // Update restaurant
    return prisma.restaurant.update({
      where: { userId: id },
      data: restaurantUpdateData,
    });
  },

  async deleteRestaurant(id: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: id },
      select: { banner: true },
    });

    await prisma.restaurant.delete({
      where: { userId: id },
    });

    if (restaurant?.banner && restaurant.banner.startsWith("/uploads/")) {
      try {
        deleteImageFile(restaurant.banner);
      } catch (e) {
        // ignore file deletion errors
      }
    }
  },




  // Explore & gallery functionality moved to dedicated modules (`/modules/explore` and `/modules/gallery`).
  // See `exploreService` and `galleryService` for implementations.

  // Get all orders for a restaurant with optional status filter
  async getRestaurantOrders(input: GetRestaurantOrdersInput) {
    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: input.restaurantId },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const where: any = { restaurantId: input.restaurantId };

    if (input.status) {
      where.status = input.status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
    });

    const total = await prisma.order.count({ where });

    return {
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.user.name,
        customerPhone: order.user.phoneNumber,
        status: order.status,
        totalAmount: Number.parseFloat(order.total.toString()),
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress?.address || "N/A",
        deliveryCity: order.deliveryAddress?.city || "N/A",
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
        })),
        itemCount: order.items.length,
      })),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  },

  // Get single order details for restaurant
  async getRestaurantOrderDetails(input: GetOrderDetailsInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
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
            postalCode: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the restaurant
    if (order.restaurantId !== input.restaurantId) {
      throw new Error("Unauthorized: This order does not belong to your restaurant");
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: Number.parseFloat(order.total.toString()),
      subtotal: Number.parseFloat(order.subtotal.toString()),
      tax: Number.parseFloat(order.tax.toString()),
      deliveryFee: Number.parseFloat(order.deliveryFee.toString()),
      discount: Number.parseFloat(order.discount.toString()),
      paymentMethod: order.paymentMethod,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      specialInstructions: order.specialInstructions,
      createdAt: order.createdAt,
      customer: {
        id: order.user.id,
        name: order.user.name,
        phoneNumber: order.user.phoneNumber,
        image: order.user.image,
      },
      deliveryAddress: {
        label: order.deliveryAddress?.label || "Delivery Address",
        address: order.deliveryAddress?.address || "N/A",
        city: order.deliveryAddress?.city || "N/A",
        postalCode: order.deliveryAddress?.postalCode || "N/A",
      },
      items: order.items.map((item) => ({
        id: item.id,
        name: item.itemName,
        quantity: item.quantity,
        unitPrice: Number.parseFloat(item.unitPrice.toString()),
        totalPrice: Number.parseFloat(item.totalPrice.toString()),
        image: item.menuItem.image,
        specialNotes: item.specialNotes,
        selectedVariations: item.selectedVariations,
        selectedAddOns: item.selectedAddOns,
      })),
    };
  },

  // Accept an order
  async acceptOrder(input: AcceptOrderInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the restaurant
    if (order.restaurantId !== input.restaurantId) {
      throw new Error("Unauthorized: This order does not belong to your restaurant");
    }

    // Order must be in PENDING status to accept
    if (order.status !== "PENDING") {
      throw new Error(`Order cannot be accepted. Current status: ${order.status}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: input.orderId },
      data: { status: "ACCEPTED" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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

    // Notify user about order acceptance
    try {
      await notifyUserOrderStatus(updatedOrder);
    } catch (error: any) {
      console.error("[Restaurant] Failed to send order acceptance notification:", error.message);
      // Don't fail order acceptance if notification fails
    }

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      customerName: updatedOrder.user.name,
      message: "Order accepted successfully",
    };
  },

  // Decline an order with reason
  async declineOrder(input: DeclineOrderInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the restaurant
    if (order.restaurantId !== input.restaurantId) {
      throw new Error("Unauthorized: This order does not belong to your restaurant");
    }

    // Order must be in PENDING or ACCEPTED status to decline
    if (order.status !== "PENDING" && order.status !== "ACCEPTED") {
      throw new Error(`Order cannot be declined. Current status: ${order.status}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: "REJECTED",
        specialInstructions: `Restaurant decline reason: ${input.reason}`,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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

    // Automatically trigger refund if:
    // 1. Payment method is CARD
    // 2. Payment status is PAID
    // 3. Stripe payment intent exists
    // let refundInitiated = false;
    // if (
    //   order.paymentMethod === "CARD" &&
    //   order.paymentStatus === "PAID" &&
    //   order.stripePaymentIntentId
    // ) {
    //   try {
    //     console.log(`[DeclineOrder] Initiating automatic refund for rejected order ${order.id}`);
    //     await refundOrder(order.id, undefined, input.restaurantId, "RESTAURANT");
    //     refundInitiated = true;
    //     console.log(`[DeclineOrder] Automatic refund initiated successfully for order ${order.id}`);
    //   } catch (error: any) {
    //     // Log error but don't fail the rejection
    //     console.error(`[DeclineOrder] Failed to initiate automatic refund for order ${order.id}:`, error.message);
    //     // Note: Order is still rejected, but refund failed - this should be handled manually
    //   }
    // }

  //   // Notify restaurant and admin about order cancellation/rejection
  //   try {
  //     await notifyRestaurantAndAdminCancelled(updatedOrder);
  //   } catch (error: any) {
  //     console.error("[Restaurant] Failed to send order rejection notification:", error.message);
  //     // Don't fail order rejection if notification fails
  //   }

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      customerName: updatedOrder.user.name,
      reason: input.reason,
      message: "Order declined successfully",
      refundInitiated: false,
    };
  },

  // Update order status (mark as ready, out for delivery, delivered)
  async updateOrderStatus(input: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the restaurant
    if (order.restaurantId !== input.restaurantId) {
      throw new Error("Unauthorized: This order does not belong to your restaurant");
    }

    // Validate status transition
    const validTransitions: { [key: string]: string[] } = {
      PENDING: ["ACCEPTED", "REJECTED"],
      ACCEPTED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY"],
      REJECTED: ["REJECTED"],
      READY: ["OUT_FOR_DELIVERY"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
    };

    if (!validTransitions[order.status]?.includes(input.status)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${input.status}`
      );
    }

    const updateData: any = { status: input.status };

    // Set delivery time if marking as delivered
    if (input.status === "DELIVERED") {
      updateData.actualDeliveryTime = new Date();
      
      // Auto-mark COD orders as paid when delivered
      if (order.paymentMethod === "CASH" && order.paymentStatus === "PENDING") {
        updateData.paymentStatus = "PAID";
        updateData.paidAt = new Date();
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: input.orderId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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

    // Notify user about order status updates (ACCEPTED → PREPARING → READY → CANCELLED)
    // Only notify for statuses that have messages defined
    try {
      await notifyUserOrderStatus(updatedOrder);
    } catch (error: any) {
      console.error("[Restaurant] Failed to send order status notification:", error.message);
      // Don't fail status update if notification fails
    }

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      customerName: updatedOrder.user.name,
      message: `Order marked as ${input.status} successfully`,
    };
  },

  // Update payment status for COD orders (disputes, corrections)
  async updatePaymentStatus(input: UpdatePaymentStatusInput) {
    const { orderId, restaurantId, paymentStatus, reason } = input;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify order belongs to the restaurant
    if (order.restaurantId !== restaurantId) {
      throw new Error("Unauthorized: This order does not belong to your restaurant");
    }

    // Only allow for COD orders
    if (order.paymentMethod !== "CASH") {
      throw new Error("Payment status updates are only allowed for COD (CASH) orders");
    }

    // Validate payment status transitions
    const validTransitions: { [key: string]: string[] } = {
      PENDING: ["PAID", "FAILED"], // Can mark as paid or failed
      PAID: ["REFUNDED", "PENDING"], // Can refund or revert to pending
      FAILED: ["PAID", "PENDING"], // Can mark as paid later or keep pending
      REFUNDED: [], // Final state - cannot change
    };

    if (!validTransitions[order.paymentStatus]?.includes(paymentStatus)) {
      throw new Error(
        `Invalid payment status transition from ${order.paymentStatus} to ${paymentStatus}`
      );
    }

    // Special validations
    if (paymentStatus === "REFUNDED" && order.paymentStatus !== "PAID") {
      throw new Error("Can only refund orders that are marked as PAID");
    }

    // Update payment status
    const updateData: any = {
      paymentStatus,
    };

    // Set paidAt when marking as PAID
    if (paymentStatus === "PAID") {
      updateData.paidAt = new Date();
    }

    // Clear paidAt when reverting from PAID
    if (paymentStatus === "PENDING" && order.paymentStatus === "PAID") {
      updateData.paidAt = null;
    }

    // Add reason to special instructions if provided
    if (reason) {
      const existingReason = order.specialInstructions || "";
      updateData.specialInstructions = `${existingReason}\n[Payment Status Update: ${paymentStatus}] ${reason}`.trim();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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

    // Log payment status change
    console.log(`[PaymentStatus] Order ${orderId} payment status changed`, {
      from: order.paymentStatus,
      to: paymentStatus,
      reason,
      restaurantId,
    });

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      paymentStatus: updatedOrder.paymentStatus,
      paidAt: updatedOrder.paidAt,
      message: `Payment status updated to ${paymentStatus} successfully`,
    };
  },

  // Get all orders and revenue for a specific restaurant with pagination
  async getRestaurantOrdersAndRevenue(
    restaurantId: string,
    page: number = 1,
    limit: number = 10
  ) {
    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      select: { userId: true, name: true },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Get total count of orders for pagination
    const totalOrders = await prisma.order.count({
      where: { restaurantId },
    });

    // Get paginated orders for the restaurant
    const orders = await prisma.order.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get all orders for revenue calculation (not paginated)
    const allOrders = await prisma.order.findMany({
      where: { restaurantId },
      select: {
        total: true,
        status: true,
      },
    });

    // Calculate total revenue (sum of all order totals)
    const totalRevenue = allOrders.reduce((sum, order) => {
      return sum + Number.parseFloat(order.total.toString());
    }, 0);

    // Calculate revenue by status (from all orders)
    const revenueByStatus = allOrders.reduce((acc, order) => {
      const status = order.status;
      const orderTotal = Number.parseFloat(order.total.toString());
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += orderTotal;
      return acc;
    }, {} as Record<string, number>);

    // Calculate orders by status (from all orders)
    const ordersByStatus = allOrders.reduce((acc, order) => {
      const status = order.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      restaurant: {
        id: restaurant.userId,
        name: restaurant.name,
      },
      summary: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        revenueByStatus,
        ordersByStatus,
      },
      pagination: {
        page,
        limit,
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
      },
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.user.name,
        customerPhone: order.user.phoneNumber,
        status: order.status,
        totalAmount: Number.parseFloat(order.total.toString()),
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress?.address || "N/A",
        deliveryCity: order.deliveryAddress?.city || "N/A",
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
        })),
        itemCount: order.items.length,
      })),
    };
  },

  // ============================
  // Explore endpoints
  // ============================

  async getExploreRestaurants() {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        approvalStatus: "APPROVED",
      },
      include: {
        mall: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        cuisineCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return restaurants.map((restaurant) => ({
      id: restaurant.userId,
      name: restaurant.name,
      banner: restaurant.banner,
      description: restaurant.description,
      location: restaurant.location,
      mainCategory: restaurant.mainCategory,
      mall: restaurant.mall,
      cuisineCategory: restaurant.cuisineCategory,
      isFavorite: restaurant.isFavorite,
    }));
  },

  async getExploreRestaurantDetail(restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      include: {
        mall: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        cuisineCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        menuCategories: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!restaurant) return null;

    // Fetch gallery images
    let galleryRows: { id: string; imageUrl: string }[] = [];
    if (hasGalleryModel()) {
      galleryRows = await (prisma as any).restaurantGallery.findMany({
        where: { restaurantId },
        select: { id: true, imageUrl: true },
        orderBy: { createdAt: "asc" },
      });
    } else {
      galleryRows = (await prisma.$queryRaw`
        SELECT "id", "imageUrl"
        FROM "RestaurantGallery"
        WHERE "restaurantId" = ${restaurantId}
        ORDER BY "createdAt" ASC
      `) as { id: string; imageUrl: string }[];
    }

    const gallery = galleryRows.map((g) => ({ id: g.id, imageUrl: g.imageUrl }));

    return {
      id: restaurant.userId,
      name: restaurant.name,
      banner: restaurant.banner,
      description: restaurant.description,
      story: restaurant.story,
      location: restaurant.location,
      mainCategory: restaurant.mainCategory,
      mall: restaurant.mall,
      cuisineCategory: restaurant.cuisineCategory,
      isFavorite: restaurant.isFavorite,
      menuCategories: restaurant.menuCategories,
      gallery,
    };
  },

  async getRestaurantGallery(restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      select: { userId: true, name: true },
    });

    if (!restaurant) return null;

    let galleryRows: { id: string; imageUrl: string; createdAt: Date }[] = [];
    if (hasGalleryModel()) {
      galleryRows = await (prisma as any).restaurantGallery.findMany({
        where: { restaurantId },
        select: { id: true, imageUrl: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
    } else {
      galleryRows = (await prisma.$queryRaw`
        SELECT "id", "imageUrl", "createdAt"
        FROM "RestaurantGallery"
        WHERE "restaurantId" = ${restaurantId}
        ORDER BY "createdAt" ASC
      `) as { id: string; imageUrl: string; createdAt: Date }[];
    }

    return {
      restaurantId: restaurant.userId,
      restaurantName: restaurant.name,
      gallery: galleryRows.map((g) => ({
        id: g.id,
        imageUrl: g.imageUrl,
        createdAt: g.createdAt,
      })),
    };
  },

  async getRestaurantStory(restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      select: {
        userId: true,
        name: true,
        story: true,
        banner: true,
      },
    });

    if (!restaurant) return null;

    return {
      id: restaurant.userId,
      name: restaurant.name,
      story: restaurant.story,
      banner: restaurant.banner,
    };
  },

  async addGallery(restaurantId: string, imageUrls: string[]) {
    if (!hasGalleryModel()) {
      throw new Error("RestaurantGallery model not available");
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      select: { userId: true },
    });

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const galleryEntries = await (prisma as any).restaurantGallery.createMany({
      data: imageUrls.map((imageUrl) => ({
        restaurantId,
        imageUrl,
      })),
    });

    return galleryEntries;
  },

  async deleteGalleryImage(restaurantId: string, galleryId: string) {
    if (!hasGalleryModel()) {
      throw new Error("RestaurantGallery model not available");
    }

    const galleryImage = await (prisma as any).restaurantGallery.findUnique({
      where: { id: galleryId },
    });

    if (!galleryImage) {
      throw new Error("Gallery image not found");
    }

    if (galleryImage.restaurantId !== restaurantId) {
      throw new Error("Gallery image does not belong to this restaurant");
    }

    // Delete the file from uploads
    if (galleryImage.imageUrl && galleryImage.imageUrl.startsWith("/uploads/")) {
      try {
        deleteImageFile(galleryImage.imageUrl);
      } catch (e) {
        console.error("Error deleting gallery image file:", e);
      }
    }

    await (prisma as any).restaurantGallery.delete({
      where: { id: galleryId },
    });

    return { success: true, message: "Gallery image deleted successfully" };
  },

  
};
