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
 * restaurants currently allowed to serve customers. A restaurant is
 * customer-visible only if BOTH:
 *
 *   1. It has at least one ACTIVE subscription whose endDate hasn't passed
 *      (the platform is paid-only for restaurants), AND
 *   2. The admin hasn't BLOCKED it (`RestaurantStatus = ACTIVE`).
 *
 * Customer-facing reads (mall list, restaurant page, menu, explore, search,
 * product detail, cart-add) use this so neither unpaid nor admin-blocked
 * restaurants ever appear in the customer app.
 *
 * Spread directly into a Restaurant-rooted `where`:
 *   where: { ...filters, ...activeSubscriptionWhere() }
 *
 * Or nest through a relation for non-restaurant-rooted queries:
 *   where: { category: { restaurant: activeSubscriptionWhere() } }
 */
export function activeSubscriptionWhere() {
  return {
    // (1) paid + still in date
    subscriptions: {
      some: {
        status: "ACTIVE" as const,
        endDate: { gte: new Date() },
      },
    },
    // (2) admin hasn't blocked them
    RestaurantStatus: "ACTIVE" as const,
    // (3) admin has approved the listing. Newly-signed-up restaurants are
    // PENDING by default; even if they pay for a subscription, they stay
    // hidden from customers until admin clicks Approve in the web app.
    approvalStatus: "APPROVED" as const,
  };
}
