import { Request, Response } from "express";
import { checkoutService } from "./checkout.service";
import {
  checkoutSchema,
  updateOrderStatusSchema,
  getOrderSchema,
  getUserOrdersSchema,
} from "./checkout.schema";

export const checkoutController = {
  // POST /checkout/create-order - Create order from cart
  async createOrder(req: Request, res: Response) {
    try {
      const parseResult = checkoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const order = await checkoutService.createOrder(parseResult.data);
      return res.status(201).json({
        message: "Order created successfully",
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("empty") || error.message.includes("same restaurant")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /checkout/summary - Get checkout summary
  async getCheckoutSummary(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const summary = await checkoutService.getCheckoutSummary(userId);
      return res.json(summary);
    } catch (error: any) {
      if (error.message.includes("empty")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /checkout/addresses - Get user's delivery addresses
  async getUserDeliveryAddresses(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const addresses = await checkoutService.getUserDeliveryAddresses(userId);
      return res.json(addresses);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /checkout/address - Add delivery address
  async addDeliveryAddress(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const { label, address, city, postalCode, isDefault } = req.body;

      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      const newAddress = await checkoutService.addDeliveryAddress(userId, {
        label,
        address,
        city,
        postalCode,
        isDefault,
      });

      return res.status(201).json({
        message: "Address added successfully",
        data: newAddress,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
