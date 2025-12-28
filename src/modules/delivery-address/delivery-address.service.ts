import prisma from "../../config/prisma";
import { CreateDeliveryAddressInput, UpdateDeliveryAddressInput } from "./delivery-address.schema";

export const deliveryAddressService = {
  // Create a new delivery address
  async createDeliveryAddress(userId: string, data: CreateDeliveryAddressInput) {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // If this address is set as default, unset all other default addresses for this user
    if (data.isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const deliveryAddress = await prisma.deliveryAddress.create({
      data: {
        userId,
        label: data.label || null,
        address: data.address,
        city: data.city || null,
        postalCode: data.postalCode || null,
        isDefault: data.isDefault || false,
      },
    });

    return deliveryAddress;
  },

  // Get all delivery addresses for a user
  async getDeliveryAddresses(userId: string) {
    const addresses = await prisma.deliveryAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return addresses;
  },

  // Get a single delivery address
  async getDeliveryAddress(userId: string, addressId: string) {
    const address = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error("Delivery address not found");
    }

    return address;
  },

  // Update a delivery address
  async updateDeliveryAddress(userId: string, addressId: string, data: UpdateDeliveryAddressInput) {
    // Verify address belongs to user
    const address = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error("Delivery address not found");
    }

    // If setting this address as default, unset all other default addresses for this user
    if (data.isDefault === true) {
      await prisma.deliveryAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    
    // Only update fields that are provided and not empty
    if (data.label !== undefined && data.label !== null && data.label.trim() !== "") {
      updateData.label = data.label;
    }
    if (data.address !== undefined && data.address !== null && data.address.trim() !== "") {
      updateData.address = data.address;
    }
    if (data.city !== undefined && data.city !== null && data.city.trim() !== "") {
      updateData.city = data.city;
    }
    if (data.postalCode !== undefined && data.postalCode !== null && data.postalCode.trim() !== "") {
      updateData.postalCode = data.postalCode;
    }
    if (data.isDefault !== undefined && data.isDefault !== null) {
      updateData.isDefault = data.isDefault;
    }

    const updatedAddress = await prisma.deliveryAddress.update({
      where: { id: addressId },
      data: updateData,
    });

    return updatedAddress;
  },

  // Delete a delivery address
  async deleteDeliveryAddress(userId: string, addressId: string) {
    // Verify address belongs to user
    const address = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error("Delivery address not found");
    }

    // Check if address is used in any orders
    const ordersCount = await prisma.order.count({
      where: { deliveryAddressId: addressId },
    });

    if (ordersCount > 0) {
      throw new Error("Cannot delete address that is associated with existing orders");
    }

    await prisma.deliveryAddress.delete({
      where: { id: addressId },
    });

    return { message: "Delivery address deleted successfully" };
  },

  // Set an address as default
  async setDefaultAddress(userId: string, addressId: string) {
    // Verify address belongs to user
    const address = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error("Delivery address not found");
    }

    // Unset all other default addresses for this user
    await prisma.deliveryAddress.updateMany({
      where: { userId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });

    // Set this address as default
    const updatedAddress = await prisma.deliveryAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return updatedAddress;
  },
};

