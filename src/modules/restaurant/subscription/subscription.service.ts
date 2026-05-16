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

/**
 * Prisma `where` fragment for Restaurant queries that should only return
 * restaurants currently allowed to serve customers — at least one ACTIVE
 * subscription whose endDate hasn't passed.
 *
 * Customer-facing reads (mall list, restaurant page, menu, explore, search,
 * product detail) use this so restaurants without an active subscription
 * never appear in the customer app. Same predicate as `isSubscriptionActive`,
 * just expressed as a relation filter so it composes into other queries.
 *
 * Spread directly into a Restaurant-rooted `where`:
 *   where: { ...filters, ...activeSubscriptionWhere() }
 *
 * Or nest through a relation for non-restaurant-rooted queries:
 *   where: { category: { restaurant: activeSubscriptionWhere() } }
 */
export function activeSubscriptionWhere() {
  return {
    subscriptions: {
      some: {
        status: "ACTIVE" as const,
        endDate: { gte: new Date() },
      },
    },
  };
}
