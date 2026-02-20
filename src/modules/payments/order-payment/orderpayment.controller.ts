import { Request, Response } from "express";
import { createStripePaymentIntent } from "./orderpayment.service";

/**
 * Create payment intent controller
 * Handles payment intent creation with proper validation and error handling
 */
export async function createPaymentIntent(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing orderId in request body",
      });
    }

    const clientSecret = await createStripePaymentIntent(req, orderId);

    // Standardized success response
    return res.status(200).json({
      success: true,
      message: "PaymentIntent created successfully",
      data: {
        clientSecret,
      },
    });
  } catch (err: any) {
    // Standardized error response with appropriate status codes
    const statusCode = err.message.includes("not found") ? 404 :
                      err.message.includes("Unauthorized") ? 403 :
                      err.message.includes("already paid") ? 400 :
                      err.message.includes("not CARD") ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to create payment intent",
    });
  }
}
