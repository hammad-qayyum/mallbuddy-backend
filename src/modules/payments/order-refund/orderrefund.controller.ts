import { Request, Response } from "express";
import { refundOrder } from "./orderrefund.service";
import { refundOrderSchema } from "./orderrefund.schema";

/**
 * Refund payment controller
 * Handles refund requests with proper validation and authorization
 */
export async function refundPayment(req: Request, res: Response) {
  try {
    // Get authenticated user info
    const auth = (req as any).auth;
    const userId = auth?.user?.id;
    const userRole = auth?.user?.role;

    // Validate request body
    const parseResult = refundOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parseResult.error.flatten(),
      });
    }

    const { orderId, amount } = parseResult.data;

    // Process refund
    const refund = await refundOrder(orderId, amount, userId, userRole);

    // Return standardized success response
    return res.status(200).json({
      success: true,
      message: "Refund initiated successfully",
      data: {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        orderId,
      },
    });
  } catch (err: any) {
    // Standardized error response
    const statusCode = err.message.includes("not found") ? 404 :
                      err.message.includes("Unauthorized") ? 403 :
                      err.message.includes("cannot exceed") ? 400 :
                      err.message.includes("not refundable") ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to process refund",
    });
  }
}
