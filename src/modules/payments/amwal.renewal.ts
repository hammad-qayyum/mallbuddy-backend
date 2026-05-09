import prisma from "../../config/prisma";
import { AmwalPayService, type PayByTokenResponse } from "../../libs/amwalpay";

const SUCCESS_RESPONSE_CODE = "00";

function toNumberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function computeEndDate(start: Date, interval: string): Date {
  const end = new Date(start);
  if (interval === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

export type RenewalOutcome =
  | { status: "renewed"; subscriptionId: string; expiresAt: Date; amwal: PayByTokenResponse }
  | { status: "declined"; subscriptionId: string; responseCode: string; message: string; errorList?: string[] | null }
  | { status: "skipped"; reason: string }
  | { status: "error"; subscriptionId?: string; error: string };

/**
 * Charge a restaurant's saved card for a subscription plan via Pay-by-Token.
 * Used both by the `/renew` HTTP endpoint and the daily renewal cron.
 *
 * Creates a fresh `RestaurantSubscription` row with status INCOMPLETE, calls
 * Amwal `Execute/PayByToken`, and on success flips the row to ACTIVE with
 * `endDate = now + plan.interval`. The previous (expired) subscription row is
 * left as-is — `isSubscriptionActive` already filters by `endDate >= now`.
 */
export async function renewSubscriptionViaPayByToken(
  restaurantId: string,
  planId: string,
): Promise<RenewalOutcome> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { userId: restaurantId },
    include: { user: { select: { email: true } } },
  });
  if (!restaurant) return { status: "skipped", reason: "Restaurant not found" };

  const customerId = (restaurant as any).amwalCustomerId as string | null | undefined;
  const customerTokenId = (restaurant as any).amwalCustomerTokenId as string | null | undefined;
  if (!customerId || !customerTokenId) {
    return { status: "skipped", reason: "Restaurant has no saved card" };
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return { status: "skipped", reason: "Plan not found" };

  const amount = toNumberValue(plan.price);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "skipped", reason: "Invalid plan amount" };
  }

  const dbSub = await prisma.restaurantSubscription.create({
    data: { restaurantId, planId, status: "INCOMPLETE", startDate: new Date() },
  });

  const amwal = new AmwalPayService();
  let result: PayByTokenResponse;
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
    return { status: "error", subscriptionId: dbSub.id, error: err.message };
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
    return { status: "renewed", subscriptionId: updated.id, expiresAt: endDate, amwal: result };
  }

  // I7 — mark the failed-renewal row PAST_DUE so the cron's
  // ACTIVE-and-expiring scan doesn't pick the *previous* expired-active row
  // up again next tick and create yet another orphan INCOMPLETE row. The
  // cron's "skip if a newer ACTIVE exists" guard alone wasn't enough because
  // the original ACTIVE row stays ACTIVE (just with a past endDate).
  await prisma.restaurantSubscription.update({
    where: { id: dbSub.id },
    data: { status: "PAST_DUE" },
  });

  return {
    status: "declined",
    subscriptionId: dbSub.id,
    responseCode: result.responseCode,
    message: result.message,
    errorList: result.errorList ?? null,
  };
}

/**
 * Find ACTIVE subscriptions that are expiring within `windowHours` (or
 * already expired) and renew each via Pay-by-Token. Skips restaurants that
 * already have a *newer* ACTIVE subscription (means a renewal already
 * succeeded for the same period — prevents double-charging).
 */
export async function processDueSubscriptionRenewals(windowHours = 24): Promise<{
  scanned: number;
  renewed: number;
  declined: number;
  skipped: number;
  errors: number;
}> {
  const now = new Date();
  const renewBefore = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const dueSubs = await prisma.restaurantSubscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lte: renewBefore },
    },
    orderBy: { endDate: "asc" },
    include: { plan: true, restaurant: true },
  });

  const stats = { scanned: dueSubs.length, renewed: 0, declined: 0, skipped: 0, errors: 0 };

  for (const sub of dueSubs) {
    const newerActive = await prisma.restaurantSubscription.findFirst({
      where: {
        restaurantId: sub.restaurantId,
        status: "ACTIVE",
        endDate: { gt: sub.endDate ?? now },
      },
      select: { id: true },
    });
    if (newerActive) {
      stats.skipped++;
      console.log("[renewal-cron] skip — already renewed", { id: sub.id });
      continue;
    }

    // I7 — also skip if the restaurant has a recent PAST_DUE attempt.
    // Without this, every cron tick re-tries the same expired ACTIVE row and
    // accumulates PAST_DUE rows every day. Operators (or a manual /renew
    // call) clear PAST_DUE; cron does not retry on its own.
    const recentPastDue = await prisma.restaurantSubscription.findFirst({
      where: {
        restaurantId: sub.restaurantId,
        status: "PAST_DUE",
        createdAt: { gt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recentPastDue) {
      stats.skipped++;
      console.log("[renewal-cron] skip — recent PAST_DUE awaits manual review", {
        subscriptionId: sub.id,
        pastDueId: recentPastDue.id,
      });
      continue;
    }

    console.log("[renewal-cron] charging", { id: sub.id, restaurantId: sub.restaurantId, planId: sub.planId });
    const outcome = await renewSubscriptionViaPayByToken(sub.restaurantId, sub.planId);
    switch (outcome.status) {
      case "renewed":
        stats.renewed++;
        console.log("[renewal-cron] renewed", { from: sub.id, to: outcome.subscriptionId, expiresAt: outcome.expiresAt });
        break;
      case "declined":
        stats.declined++;
        console.warn("[renewal-cron] declined", { id: sub.id, code: outcome.responseCode, message: outcome.message });
        break;
      case "skipped":
        stats.skipped++;
        console.log("[renewal-cron] skipped", { id: sub.id, reason: outcome.reason });
        break;
      case "error":
        stats.errors++;
        console.error("[renewal-cron] error", { id: sub.id, error: outcome.error });
        break;
    }
  }

  return stats;
}

/**
 * I12 — Delete `INCOMPLETE` subscription rows older than `olderThanDays`.
 *
 * Every `/initiate` call creates an `INCOMPLETE` row before the customer
 * even loads the SmartBox popup. Most are abandoned (popup closed, browser
 * crashed, decline, etc.) and never become ACTIVE. Without cleanup the
 * table grows linearly with attempts.
 *
 * Safe by design: only deletes rows that have been `INCOMPLETE` since their
 * creation — never touches anything that was ever `ACTIVE`.
 */
export async function cleanupStaleIncompleteSubscriptions(olderThanDays = 7): Promise<{
  deleted: number;
}> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.restaurantSubscription.deleteMany({
    where: {
      status: "INCOMPLETE",
      createdAt: { lt: cutoff },
    },
  });
  console.log("[renewal-cron] cleanup", { deleted: result.count, olderThanDays });
  return { deleted: result.count };
}
