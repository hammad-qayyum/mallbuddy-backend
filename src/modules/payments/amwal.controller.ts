import { Request, Response } from "express";
import { AmwalPayService } from "../../libs/amwalpay";
import prisma from "../../config/prisma";

function toNumberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toNumber" in value) {
    const maybeDecimal = value as { toNumber: () => number };
    return maybeDecimal.toNumber();
  }
  return Number(value);
}

// Initiate Amwal payment for restaurant subscription
export const initiateAmwalSubscriptionPayment = async (req: Request, res: Response) => {
  try {
    const { restaurantId, planId } = req.body;
    if (!restaurantId || !planId) {
      return res.status(400).json({ success: false, error: "restaurantId and planId are required" });
    }
    const restaurant = await prisma.restaurant.findUnique({ where: { userId: restaurantId } });
    if (!restaurant) return res.status(404).json({ success: false, error: "Restaurant not found" });
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });

    const amount = toNumberValue(plan.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid subscription plan amount" });
    }

    // Create a pending subscription record
    const dbSub = await prisma.restaurantSubscription.create({
      data: {
        restaurantId,
        planId,
        status: "INCOMPLETE",
        startDate: new Date(),
      },
    });

    const computedReturnUrl = `${req.protocol}://${req.get("host")}/api/payments/amwal/return`;
    const returnUrl = process.env.AMWAL_RETURN_URL || computedReturnUrl;

    // Build the signed hosted-payment-page redirect URL (no outbound API call needed)
    const amwal = new AmwalPayService();
    const result = amwal.createPaymentIntent({
      amount,
      currency: "SAR",
      order_id: dbSub.id,
      description: `Subscription payment for plan ${plan.name}`,
      return_url: returnUrl,
    });

    const paymentUrl = result.data.paymentUrl;

    return res.json({
      success: true,
      paymentUrl,
      subscriptionId: dbSub.id,
    });
  } catch (err: any) {
    console.error("[Amwal] Payment initiation error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
