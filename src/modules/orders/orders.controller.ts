import { Request, Response } from "express";
import { ordersService } from "./orders.service";
import {
  getUserOrdersSchema,
  getActiveOrdersSchema,
  getPastOrdersSchema,
  cancelOrderSchema,
  reorderSchema,
  getOrderDetailsSchema,
  getOrderSummarySchema,
  getAcceptedOrdersSchema,
} from "./orders.schema";

export const ordersController = {
  /**
   * GET /orders/list - Get all orders for user with optional filtering
   */
  async getUserOrders(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const status = (req.query.status ?? req.body?.status) as string | undefined;
      const limit = Number.parseInt((req.query.limit ?? "10") as string);
      const offset = Number.parseInt((req.query.offset ?? "0") as string);

      const parseResult = getUserOrdersSchema.safeParse({ userId, status, limit, offset });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const orders = await ordersService.getUserOrders(parseResult.data.userId, status, limit, offset);

      return res.json({
        message: "Orders retrieved successfully",
        data: orders,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/active - Get active orders (in progress)
   */
  async getActiveOrders(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const limit = Number.parseInt((req.query.limit ?? "10") as string);
      const offset = Number.parseInt((req.query.offset ?? "0") as string);

      const parseResult = getActiveOrdersSchema.safeParse({ userId, limit, offset });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const orders = await ordersService.getActiveOrders(parseResult.data.userId, limit, offset);

      return res.json({
        message: "Active orders retrieved successfully",
        data: orders,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/past - Get past orders (completed or cancelled)
   */
  async getPastOrders(req: Request, res: Response) {
    try {
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;
      const limit = Number.parseInt((req.query.limit ?? "10") as string);
      const offset = Number.parseInt((req.query.offset ?? "0") as string);

      const parseResult = getPastOrdersSchema.safeParse({ userId, limit, offset });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const orders = await ordersService.getPastOrders(parseResult.data.userId, limit, offset);

      return res.json({
        message: "Past orders retrieved successfully",
        data: orders,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * POST /orders/cancel - Cancel an order with reason
   */
  async cancelOrder(req: Request, res: Response) {
    try {
      const parseResult = cancelOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.issues,
        });
      }

      const result = await ordersService.cancelOrder(parseResult.data);

      return res.json({
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized") || error.message.includes("cannot be cancelled")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * POST /orders/reorder - Reorder items from a past order
   */
  async reorder(req: Request, res: Response) {
    try {
      const parseResult = reorderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request body",
          errors: parseResult.error.issues,
        });
      }

      const result = await ordersService.reorderFromPastOrder(parseResult.data);

      return res.status(201).json({
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized") || error.message.includes("can only reorder")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/cancellation-reasons - Get available cancellation reasons
   */
  async getCancellationReasons(req: Request, res: Response) {
    try {
      const reasons = await ordersService.getCancellationReasons();

      return res.json({
        message: "Cancellation reasons retrieved successfully",
        data: reasons,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/:orderId/reorder-preview - Get order details for reorder preview
   */
  async getOrderForReorder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = (req.query.userId ?? req.body?.userId) as string | undefined;

      if (!userId || !orderId) {
        return res.status(400).json({ message: "User ID and Order ID are required" });
      }

      const order = await ordersService.getOrderForReorder(orderId, userId);

      return res.json({
        message: "Order details retrieved successfully",
        data: order,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/:orderId - Get detailed order information
   */
  async getOrderDetails(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const parseResult = getOrderDetailsSchema.safeParse({ orderId });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid order ID",
          errors: parseResult.error.flatten(),
        });
      }

      const orderDetails = await ordersService.getOrderDetails(parseResult.data.orderId);
      return res.json(orderDetails);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/:orderId/summary - Get quick order summary
   */
  async getOrderSummary(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const parseResult = getOrderSummarySchema.safeParse({ orderId });
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid order ID",
          errors: parseResult.error.flatten(),
        });
      }

      const summary = await ordersService.getOrderSummary(parseResult.data.orderId);
      return res.json(summary);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /orders/restaurant/:restaurantId/accepted - Get accepted orders (order queue)
   */
  async getAcceptedOrders(req: Request, res: Response) {
    try {
      const { restaurantId } = req.params;
      const limit = Number.parseInt((req.query.limit ?? "50") as string);
      const offset = Number.parseInt((req.query.offset ?? "0") as string);

      const parseResult = getAcceptedOrdersSchema.safeParse({
        restaurantId,
        limit,
        offset,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: parseResult.error.issues,
        });
      }

      const orders = await ordersService.getAcceptedOrders(parseResult.data);

      return res.json({
        message: "Accepted orders retrieved successfully",
        data: orders,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: error.message });
    }
  },
};
