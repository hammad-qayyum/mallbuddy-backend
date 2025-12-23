import prisma from "../../config/prisma";
import { deleteImageFile } from "../../config/upload";
import {
  CreateRestaurantInput,
  UpdateRestaurantInput,
  AcceptOrderInput,
  DeclineOrderInput,
  UpdateOrderStatusInput,
  GetRestaurantOrdersInput,
  GetOrderDetailsInput,
} from "./restaurant.schema";
import { exploreService } from "../explore/explore.service";
import { galleryService } from "../gallery/gallery.service";

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

  async createRestaurant(data: CreateRestaurantInput) {
    // derive restaurant name from the user to satisfy required `name` field
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { name: true, firstName: true, lastName: true },
    });

    const candidateName =
      data.name ?? user?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ");

    const restaurantName = candidateName || "Default Restaurant Name";

    // Prisma types are strict here; cast to any to avoid exactOptionalPropertyTypes friction
    return prisma.restaurant.create({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      data: {
        userId: data.userId,
        mallId: data.mallId,
        mainCategory: data.mainCategory ?? null,
        name: restaurantName,
        ...(data.cuisineCategoryId !== undefined && { cuisineCategoryId: data.cuisineCategoryId }),
        ...(data.banner !== undefined && { banner: data.banner }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.story !== undefined && { story: data.story }),
        ...(data.location !== undefined && { location: data.location }),
      } as any,
    });
  },

  async getAllRestaurants(
    mallId: string,
    category?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const where: any = { mallId };
    if (category) where.mainCategory = category;

    const total = await prisma.restaurant.count({ where });

    const data = await prisma.restaurant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { user: true },
    });

    return { data, total, page, limit };
  },

  async getRestaurantDetails(restaurantId: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
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

    const updateData: any = {};
    if (data.mallId !== undefined) updateData.mallId = data.mallId;
    if (data.mainCategory !== undefined) updateData.mainCategory = data.mainCategory;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.story !== undefined) updateData.story = data.story;
    if (data.banner !== undefined) {
      // remove previous uploaded banner file if present
      if (currentRestaurant?.banner && currentRestaurant.banner.startsWith("/uploads/")) {
        try {
          deleteImageFile(currentRestaurant.banner);
        } catch (e) {
          // ignore file deletion errors
        }
      }
      updateData.banner = data.banner;
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.cuisineCategoryId !== undefined) updateData.cuisineCategoryId = data.cuisineCategoryId;
    if ((data as any).isFavorite !== undefined) updateData.isFavorite = (data as any).isFavorite;
    return prisma.restaurant.update({
      where: { userId: id },
      data: updateData,
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
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

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
        status: "CANCELLED",
        specialInstructions: `Restaurant decline reason: ${input.reason}`,
      },
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      customerName: updatedOrder.user.name,
      reason: input.reason,
      message: "Order declined successfully",
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
      PENDING: ["ACCEPTED"],
      ACCEPTED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY"],
      READY: ["OUT_FOR_DELIVERY"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
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
    }

    const updatedOrder = await prisma.order.update({
      where: { id: input.orderId },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
    });

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      customerName: updatedOrder.user.name,
      message: `Order marked as ${input.status} successfully`,
    };
  },
};
