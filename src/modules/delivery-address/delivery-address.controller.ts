import { Request, Response } from "express";
import { deliveryAddressService } from "./delivery-address.service";
import {
  createDeliveryAddressSchema,
  updateDeliveryAddressSchema,
} from "./delivery-address.schema";

export const deliveryAddressController = {
  // POST /delivery-addresses - Create a new delivery address
  async createDeliveryAddress(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const parseResult = createDeliveryAddressSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const deliveryAddress = await deliveryAddressService.createDeliveryAddress(
        userId,
        parseResult.data
      );
      return res.status(201).json(deliveryAddress);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /delivery-addresses - Get all delivery addresses for user
  async getDeliveryAddresses(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const addresses = await deliveryAddressService.getDeliveryAddresses(userId);
      return res.json(addresses);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /delivery-addresses/:addressId - Get a single delivery address
  async getDeliveryAddress(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { addressId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!addressId) {
        return res.status(400).json({ message: "Address ID is required" });
      }

      const address = await deliveryAddressService.getDeliveryAddress(
        userId,
        addressId
      );
      return res.json(address);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // PUT /delivery-addresses/:addressId - Update a delivery address
  async updateDeliveryAddress(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { addressId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!addressId) {
        return res.status(400).json({ message: "Address ID is required" });
      }

      const parseResult = updateDeliveryAddressSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const updatedAddress = await deliveryAddressService.updateDeliveryAddress(
        userId,
        addressId,
        parseResult.data
      );
      return res.json(updatedAddress);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // DELETE /delivery-addresses/:addressId - Delete a delivery address
  async deleteDeliveryAddress(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { addressId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!addressId) {
        return res.status(400).json({ message: "Address ID is required" });
      }

      const result = await deliveryAddressService.deleteDeliveryAddress(userId, addressId);
      return res.json(result);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Cannot delete")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // PUT /delivery-addresses/:addressId/set-default - Set an address as default
  async setDefaultAddress(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const { addressId } = req.params;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!addressId) {
        return res.status(400).json({ message: "Address ID is required" });
      }

      const updatedAddress = await deliveryAddressService.setDefaultAddress(userId, addressId);
      return res.json(updatedAddress);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },
};

