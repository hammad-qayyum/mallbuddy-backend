import { Request, Response } from "express";
import {
  attachPaymentMethodToUser,
  listUserPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "./paymentMethod.service";
import prisma from "../../../config/prisma";

/**
 * POST /payment-methods
 * Add a card payment method
 */
export async function addPaymentMethod(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;

    if (!auth || !auth.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const userId = auth.user.id;

    if (!req.body?.paymentMethodId) {
      return res
        .status(400)
        .json({ message: "Missing paymentMethodId in request body." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        message: "Stripe customer not created for this user.",
      });
    }

    const paymentMethod = await attachPaymentMethodToUser(
      user.id,
      user.stripeCustomerId,
      req.body.paymentMethodId
    );

    res.status(201).json(paymentMethod);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to attach payment method.",
      error: error.message,
    });
  }
}

/**
 * GET /payment-methods
 * Get user's saved payment methods
 */
export async function getMyPaymentMethods(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;

    if (!auth || !auth.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const userId = auth.user.id;

    const methods = await listUserPaymentMethods(userId);
    res.json(methods);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch payment methods.",
      error: error.message,
    });
  }
}

/**
 * DELETE /payment-methods/:id
 * Remove a saved payment method
 */
export async function removePaymentMethod(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;

    if (!auth || !auth.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const userId = auth.user.id;
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing payment method id." });
    }

    await deletePaymentMethod(userId, id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: "Failed to remove payment method.",
      error: error.message,
    });
  }
}

/**
 * PATCH /payment-methods/:id/default
 * Set a payment method as default
 */
export async function makePaymentMethodDefault(
  req: Request,
  res: Response
) {
  try {
    const auth = (req as any).auth;

    if (!auth || !auth.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const userId = auth.user.id;
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "Missing payment method id." });
    }

    const updated = await setDefaultPaymentMethod(userId, id);
    res.json(updated);
  } catch (error: any) {
    if (error.message && error.message.includes("not found")) {
      return res.status(404).json({
        message: error.message,
      });
    }
    res.status(500).json({
      message: "Failed to set default payment method.",
      error: error.message,
    });
  }
}
