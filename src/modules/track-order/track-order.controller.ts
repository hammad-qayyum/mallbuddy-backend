import { Request, Response } from "express";
import { trackOrderService } from "./track-order.service";
import { trackOrderSchema } from "./track-order.schema";

export const trackOrderController = {
  // GET /track-order/:orderId - Get full tracking information
  async getOrderTracking(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const parseResult = trackOrderSchema.safeParse({ orderId });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid order ID",
          errors: parseResult.error.flatten(),
        });
      }

      const trackingInfo = await trackOrderService.getOrderTrackingInfo(parseResult.data.orderId);
      return res.json(trackingInfo);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /track-order/status/:orderId - Get current order status
  async getOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const parseResult = trackOrderSchema.safeParse({ orderId });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid order ID",
          errors: parseResult.error.flatten(),
        });
      }

      const status = await trackOrderService.getOrderStatus(parseResult.data.orderId);
      return res.json(status);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },
};
