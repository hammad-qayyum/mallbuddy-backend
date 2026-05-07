import { AmwalPayService } from "../../../libs/amwalpay";
import prisma from "../../../config/prisma";
import dotenv from "dotenv";
dotenv.config();

function toNumberValue(value: unknown): number {
	if (typeof value === "number") return value;
	if (typeof value === "object" && value && "toNumber" in value) {
		const maybeDecimal = value as { toNumber: () => number };
		return maybeDecimal.toNumber();
	}
	return Number(value);
}

/**
 * Start a SmartBox checkout for a restaurant's first subscription on a plan.
 * Creates an INCOMPLETE row; the webhook flips it to ACTIVE and sets endDate
 * once Amwal confirms the payment.
 */
export async function createRestaurantSubscription(restaurantId: string, planId: string) {
	const restaurant = await prisma.restaurant.findUnique({
		where: { userId: restaurantId },
	});
	if (!restaurant) throw new Error("Restaurant not found");

	const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
	if (!plan) throw new Error("Plan not found");

	const amount = toNumberValue(plan.price);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error("Invalid subscription plan amount");
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
	const smartbox = amwal.buildSmartBoxConfig({
		amount,
		currency: "OMR",
		merchantReference: dbSub.id,
	});

	return {
		dbSub,
		scriptUrl: AmwalPayService.scriptUrl,
		smartbox,
	};
}

/**
 * Start a SmartBox checkout to switch an existing subscription to a new plan.
 * The plan change is not applied until the webhook confirms payment.
 */
export async function updateRestaurantSubscription(subscriptionId: string, newPlanId: string) {
	const sub = await prisma.restaurantSubscription.findUnique({ where: { id: subscriptionId } });
	if (!sub) throw new Error("Subscription not found");

	const plan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
	if (!plan) throw new Error("New plan not found");

	const amount = toNumberValue(plan.price);
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error("Invalid subscription plan amount");
	}

	const pendingSub = await prisma.restaurantSubscription.create({
		data: {
			restaurantId: sub.restaurantId,
			planId: newPlanId,
			status: "INCOMPLETE",
			startDate: new Date(),
		},
	});

	const amwal = new AmwalPayService();
	const smartbox = amwal.buildSmartBoxConfig({
		amount,
		currency: "OMR",
		merchantReference: pendingSub.id,
	});

	return {
		dbSub: pendingSub,
		scriptUrl: AmwalPayService.scriptUrl,
		smartbox,
	};
}

/**
 * Cancel subscription
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
 * List subscriptions
 */
export async function listRestaurantSubscriptions(restaurantId: string) {
	return await prisma.restaurantSubscription.findMany({
		where: { restaurantId },
		include: { plan: true },
	});
}

/**
 * Check if a restaurant's subscription is active and payment is up-to-date
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
