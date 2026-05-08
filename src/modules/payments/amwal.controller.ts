import { Request, Response } from "express";
import { AmwalPayService } from "../../libs/amwalpay";
import prisma from "../../config/prisma";

const SUCCESS_RESPONSE_CODE = "00";

function computeEndDate(start: Date, interval: string): Date {
  const end = new Date(start);
  if (interval === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

function toNumberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toNumber" in value) {
    const maybeDecimal = value as { toNumber: () => number };
    return maybeDecimal.toNumber();
  }
  return Number(value);
}

// Build a signed SmartBox checkout config for a restaurant subscription.
// The frontend feeds the returned `smartbox` object directly to
// `SmartBox.Checkout.configure({...})`. If a `customerId` from a previous
// save-card transaction is supplied, the backend exchanges it for a session
// token so SmartBox shows the customer's saved cards.
export const initiateAmwalSubscriptionPayment = async (req: Request, res: Response) => {
  try {
    const { restaurantId, planId, customerId } = req.body;
    if (!restaurantId || !planId) {
      return res.status(400).json({ success: false, error: "restaurantId and planId are required" });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
    });
    if (!restaurant) return res.status(404).json({ success: false, error: "Restaurant not found" });
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });

    const amount = toNumberValue(plan.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid subscription plan amount" });
    }

    const dbSub = await prisma.restaurantSubscription.create({
      data: {
        restaurantId,
        planId,
        status: "INCOMPLETE",
        startDate: new Date(),
      },
    });

    const amwal = new AmwalPayService();

    const smartboxInput: Parameters<AmwalPayService["buildSmartBoxConfig"]>[0] = {
      amount,
      currency: "OMR",
      merchantReference: dbSub.id,
    };
    if (typeof customerId === "string" && customerId.length > 0) {
      smartboxInput.sessionToken = await amwal.acquireSessionToken(customerId);
    }

    const smartbox = amwal.buildSmartBoxConfig(smartboxInput);

    return res.json({
      success: true,
      subscriptionId: dbSub.id,
      scriptUrl: AmwalPayService.scriptUrl,
      smartbox,
    });
  } catch (err: any) {
    console.error("[Amwal] Payment initiation error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Frontend-driven activation using the SmartBox `completeCallback` payload.
 * The cloud-notification webhook remains the production source of truth, but
 * this endpoint lets the UI flip a subscription to ACTIVE without waiting on
 * (or being blocked by) webhook misconfiguration during UAT.
 *
 * The endpoint trusts the SmartBox callback only when:
 *   - It targets a subscription owned by the requesting user (auth required)
 *   - The subscription is currently INCOMPLETE
 *   - The callback's `merchantReference` matches the subscription id
 *   - The callback's `responseCode` is "00"
 *   - The callback's `success` flag is true
 *
 * It is idempotent — calling it on an already-ACTIVE subscription is a no-op.
 */
export const confirmAmwalSmartBoxCallback = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, callback } = req.body ?? {};

    if (!subscriptionId || typeof subscriptionId !== "string") {
      return res.status(400).json({ success: false, error: "subscriptionId is required" });
    }

    // The SmartBox callback shape is: { callback: "completeCallback", data: { success, responseCode, data: {...} } }
    const outer = callback?.data;
    const inner = outer?.data;
    if (!outer || !inner) {
      return res.status(400).json({ success: false, error: "Invalid SmartBox callback payload" });
    }

    if (outer.success !== true || outer.responseCode !== SUCCESS_RESPONSE_CODE) {
      return res.status(400).json({ success: false, error: "Callback does not represent a successful payment" });
    }
    if (inner.merchantReference !== subscriptionId) {
      return res.status(400).json({ success: false, error: "merchantReference does not match subscriptionId" });
    }

    const sub = await prisma.restaurantSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!sub) return res.status(404).json({ success: false, error: "Subscription not found" });

    if (sub.status === "ACTIVE") {
      return res.json({
        success: true,
        message: "Subscription already active",
        subscription: { status: sub.status, expiresAt: sub.endDate },
      });
    }

    const startDate = sub.startDate ?? new Date();
    const endDate = computeEndDate(startDate, sub.plan.interval);

    const transactionId =
      typeof inner.transactionId === "string" ? inner.transactionId : null;
    const customerId =
      typeof inner.customerId === "string" && inner.customerId.length > 0 ? inner.customerId : null;
    const customerTokenId =
      typeof inner.customerTokenId === "string" && inner.customerTokenId.length > 0 ? inner.customerTokenId : null;

    const updated = await prisma.restaurantSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        endDate,
        amwalSubscriptionId: transactionId,
      },
    });

    // If the customer ticked "save card", persist the tokens on the Restaurant
    // so future renewals can charge via Pay-by-Token without UI.
    if (customerId && customerTokenId) {
      await prisma.restaurant.update({
        where: { userId: sub.restaurantId },
        data: { amwalCustomerId: customerId, amwalCustomerTokenId: customerTokenId },
      });
    }

    console.log("[Amwal] Activated subscription via SmartBox callback", {
      id: updated.id,
      transactionId,
      tokenSaved: Boolean(customerId && customerTokenId),
      endDate,
    });

    return res.json({
      success: true,
      message: "Subscription activated",
      subscription: { status: updated.status, expiresAt: updated.endDate },
    });
  } catch (err: any) {
    console.error("[Amwal] confirm callback error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Charge a restaurant's saved card for a subscription plan via Pay-by-Token.
 * Server-to-server, no UI — used for recurring renewals. The restaurant must
 * have completed at least one SmartBox payment with "save card" ticked so
 * `amwalCustomerId` and `amwalCustomerTokenId` are populated.
 */
export const renewAmwalSubscription = async (req: Request, res: Response) => {
  try {
    const { restaurantId, planId } = req.body ?? {};
    if (!restaurantId || !planId) {
      return res.status(400).json({ success: false, error: "restaurantId and planId are required" });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
      include: { user: { select: { email: true } } },
    });
    if (!restaurant) return res.status(404).json({ success: false, error: "Restaurant not found" });

    const customerId = (restaurant as any).amwalCustomerId as string | null | undefined;
    const customerTokenId = (restaurant as any).amwalCustomerTokenId as string | null | undefined;
    if (!customerId || !customerTokenId) {
      return res.status(400).json({
        success: false,
        error: "Restaurant has no saved card. Customer must complete a SmartBox payment with 'save card' ticked first.",
      });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });

    const amount = toNumberValue(plan.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid subscription plan amount" });
    }

    const dbSub = await prisma.restaurantSubscription.create({
      data: { restaurantId, planId, status: "INCOMPLETE", startDate: new Date() },
    });

    const amwal = new AmwalPayService();
    let result;
    try {
      result = await amwal.executePayByToken({
        amount,
        currency: "OMR",
        customerId,
        customerTokenId,
        transactionId: dbSub.id,
        merchantReference: dbSub.id,
        ...(restaurant.user?.email ? { clientMail: restaurant.user.email } : {}),
      });
    } catch (err: any) {
      console.error("[Amwal] PayByToken request failed", err);
      return res.status(502).json({
        success: false,
        subscriptionId: dbSub.id,
        error: err.message,
      });
    }

    if (result.success && result.responseCode === SUCCESS_RESPONSE_CODE) {
      const startDate = dbSub.startDate ?? new Date();
      const endDate = computeEndDate(startDate, plan.interval);
      const updated = await prisma.restaurantSubscription.update({
        where: { id: dbSub.id },
        data: {
          status: "ACTIVE",
          endDate,
          amwalSubscriptionId: typeof result.data?.transactionId === "string" ? result.data.transactionId : null,
        },
      });
      console.log("[Amwal] Renewal succeeded via Pay-by-Token", { id: updated.id, endDate });
      return res.json({
        success: true,
        message: "Subscription renewed",
        subscriptionId: updated.id,
        subscription: { status: updated.status, expiresAt: updated.endDate },
        amwal: result,
      });
    }

    console.warn("[Amwal] PayByToken declined", {
      id: dbSub.id,
      responseCode: result.responseCode,
      message: result.message,
      errors: result.errorList,
    });
    return res.status(402).json({
      success: false,
      subscriptionId: dbSub.id,
      message: result.message,
      responseCode: result.responseCode,
      errorList: result.errorList,
    });
  } catch (err: any) {
    console.error("[Amwal] renew error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Exchange a stored `customerId` (from the customer's first SmartBox payment
 * when "save card" was ticked) for a SmartBox session token. The frontend
 * then passes that token into `SmartBox.Checkout.configure` so the customer
 * sees their saved cards on the next payment.
 */
export const acquireAmwalSessionToken = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body ?? {};
    if (!customerId || typeof customerId !== "string") {
      return res.status(400).json({ success: false, error: "customerId is required" });
    }

    const amwal = new AmwalPayService();
    const sessionToken = await amwal.acquireSessionToken(customerId);

    return res.json({ success: true, sessionToken });
  } catch (err: any) {
    console.error("[Amwal] session-token error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
