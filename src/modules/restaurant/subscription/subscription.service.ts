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

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = source[key];
		if (typeof value === "string" && value.trim().length > 0) return value;
	}
	return null;
}

function buildReturnUrl(restaurantId: string, planId: string): string {
	const baseUrl = (process.env.AMWAL_RETURN_URL || "http://localhost:3000/subscription/payment-result").replace(/\/+$/, "");
	const params = new URLSearchParams({ restaurantId, planId });
	return `${baseUrl}?${params.toString()}`;
}
/**
 * Create subscription using Amwal Pay
 * Initiates a payment and creates a subscription record if payment is successful.
 */
export async function createRestaurantSubscription(restaurantId: string, planId: string) {
	const restaurant = await prisma.restaurant.findUnique({ where: { userId: restaurantId } });
	if (!restaurant) throw new Error("Restaurant not found");

	const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
	if (!plan) throw new Error("Plan not found");

	const amwalService = new AmwalPayService();
	const amount = toNumberValue(plan.price);
	const paymentResult = await amwalService.createPaymentIntent({
		amount,
		currency: "SAR",
		order_id: `sub_${restaurantId}_${Date.now()}`,
		description: `Subscription payment for plan ${plan.name}`,
		return_url: buildReturnUrl(restaurantId, planId),
		metadata: { restaurantId, planId },
	});
	const providerData = (paymentResult?.data && typeof paymentResult.data === "object") ? paymentResult.data as Record<string, unknown> : {};
	const paymentId = pickString(providerData, ["paymentId", "payment_id", "id", "transaction_id"]);
	const paymentUrl = pickString(providerData, ["paymentUrl", "payment_url", "redirectUrl", "redirect_url", "url"]);

	if (!paymentUrl) {
		throw new Error("Payment failed: provider response did not include payment URL");
	}

	const startDate = new Date();
	let endDate: Date;
	if (plan.interval === "MONTHLY") {
		endDate = new Date(startDate);
		endDate.setMonth(endDate.getMonth() + 1);
	} else if (plan.interval === "YEARLY") {
		endDate = new Date(startDate);
		endDate.setFullYear(endDate.getFullYear() + 1);
	} else {
		endDate = new Date(startDate);
		endDate.setMonth(endDate.getMonth() + 1);
	}

	const dbSub = await prisma.restaurantSubscription.create({
		data: {
			restaurantId,
			planId,
			status: "ACTIVE",
			startDate,
			endDate,
			amwalSubscriptionId: paymentId,
		},
	});

	return {
		dbSub,
		paymentUrl,
	};
}

/**
 * Update subscription plan (admin or restaurant upgrades/downgrades)
 * This should also require a new payment for the new plan.
 */
export async function updateRestaurantSubscription(subscriptionId: string, newPlanId: string) {
	const sub = await prisma.restaurantSubscription.findUnique({ where: { id: subscriptionId } });
	if (!sub) throw new Error("Subscription not found");
	const plan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
	if (!plan) throw new Error("New plan not found");

	const amwalService = new AmwalPayService();
	const amount = toNumberValue(plan.price);
	const paymentResult = await amwalService.createPaymentIntent({
		amount,
		currency: "SAR",
		order_id: `subchg_${subscriptionId}_${Date.now()}`,
		description: `Subscription plan change to ${plan.name}`,
		return_url: buildReturnUrl(sub.restaurantId, newPlanId),
		metadata: { subscriptionId, newPlanId },
	});
	const providerData = (paymentResult?.data && typeof paymentResult.data === "object") ? paymentResult.data as Record<string, unknown> : {};
	const paymentId = pickString(providerData, ["paymentId", "payment_id", "id", "transaction_id"]);
	const paymentUrl = pickString(providerData, ["paymentUrl", "payment_url", "redirectUrl", "redirect_url", "url"]);

	if (!paymentUrl) {
		throw new Error("Payment failed: provider response did not include payment URL");
	}

	const dbSub = await prisma.restaurantSubscription.update({
		where: { id: subscriptionId },
		data: {
			planId: newPlanId,
			amwalSubscriptionId: paymentId,
			status: "ACTIVE",
		},
	});

	return { dbSub, paymentUrl };
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
 * Returns true if active and not expired, false otherwise
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
