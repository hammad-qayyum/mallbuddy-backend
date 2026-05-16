import { Request, Response } from "express";
import { checkoutService } from "./checkout.service";
import {
  checkoutSchema,
} from "./checkout.schema";
import { getAuthUserId } from "../common/utils";

function requireAuthUserId(req: Request, res: Response): string | null {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return userId;
}

export const checkoutController = {
  // POST /checkout/create-order - Create order from the authenticated user's cart
  async createOrder(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const parseResult = checkoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.flatten(),
        });
      }

      const order = await checkoutService.createOrder(parseResult.data, userId);
      return res.status(201).json({
        message: "Order created successfully",
        data: order,
      });
    } catch (error: any) {
      const msg = error?.message || "Failed to create order";
      if (msg.includes("not found")) {
        return res.status(404).json({ message: msg });
      }
      if (msg.includes("does not belong")) {
        return res.status(403).json({ message: msg });
      }
      if (
        msg.includes("empty") ||
        msg.includes("same restaurant") ||
        msg.includes("Invalid restaurant")
      ) {
        return res.status(400).json({ message: msg });
      }
      if (msg.includes("closed")) {
        return res.status(409).json({ message: msg });
      }
      console.error("[Checkout.createOrder] unexpected error:", error);
      return res.status(500).json({ message: "Failed to create order" });
    }
  },

  // GET /checkout/summary - Get checkout summary for the authenticated user
  async getCheckoutSummary(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const summary = await checkoutService.getCheckoutSummary(userId);
      return res.json(summary);
    } catch (error: any) {
      if (error.message.includes("empty")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /checkout/addresses - Get the authenticated user's delivery addresses
  async getUserDeliveryAddresses(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

      const addresses = await checkoutService.getUserDeliveryAddresses(userId);
      return res.json(addresses);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /checkout/address - Add a delivery address for the authenticated user
  async addDeliveryAddress(req: Request, res: Response) {
    try {
      const userId = requireAuthUserId(req, res);
      if (!userId) return;

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
