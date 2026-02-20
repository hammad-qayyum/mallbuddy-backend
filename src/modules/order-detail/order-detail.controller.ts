import { Request, Response } from "express";
import { orderDetailService } from "./order-detail.service";
import { orderDetailSchema } from "./order-detail.schema";

export const orderDetailController = {
  // GET /order-detail/:orderId - Get detailed order information
  async getOrderDetails(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const parseResult = orderDetailSchema.safeParse({ orderId });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid order ID",
          errors: parseResult.error.flatten(),
        });
      }

      const orderDetails = await orderDetailService.getOrderDetails(parseResult.data.orderId);
      return res.json(orderDetails);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /order-detail/summary/:orderId - Get quick order summary
  async getOrderSummary(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const parseResult = orderDetailSchema.safeParse({ orderId });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid order ID",
          errors: parseResult.error.flatten(),
        });
      }

      const summary = await orderDetailService.getOrderSummary(parseResult.data.orderId);
      return res.json(summary);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /order-detail/user/:userId - Get all orders for a user
  async getUserOrders(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status, limit = "10", offset = "0" } = req.query;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const orders = await orderDetailService.getUserOrdersList(
        userId,
        status as string | undefined,
        parseInt(limit as string),
        parseInt(offset as string),
      );
      return res.json(orders);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
