import prisma from "../../../config/prisma";

// Subscription create/update/renewal flows live in `src/modules/payments/`
// (see amwal.controller.ts and amwal.renewal.ts). This file holds only
// the cancel + list + active-check helpers.

/**
 * Cancel an active subscription. Marks status=CANCELLED and sets endDate=now
 * so any subscription-gated route immediately returns 402.
 */
export async function cancelRestaurantSubscription(subscriptionId: string) {
  const sub = await prisma.restaurantSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Subscription not found");

  const dbSub = await prisma.restaurantSubscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", endDate: new Date() },
  });

  return { dbSub };
}

/**
 * List subscriptions (active, expired, cancelled, past-due) for a restaurant.
 */
export async function listRestaurantSubscriptions(restaurantId: string) {
  return await prisma.restaurantSubscription.findMany({
    where: { restaurantId },
    include: { plan: true },
  });
}

/**
 * Check if a restaurant has a currently-active, paid subscription.
 * Used by `requireActiveSubscription` middleware.
 */
export async function isSubscriptionActive(restaurantId: string) {
  const now = new Date();
  const sub = await prisma.restaurantSubscription.findFirst({
    where: {
      restaurantId,
      status: "ACTIVE",
      endDate: { gte: now },
    },
    orderBy: { endDate: "desc" },
  });
  return !!sub;
}
