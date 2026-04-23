import { Request, Response } from "express";
import prisma from "../../../config/prisma";
import { SubscriptionStatus } from "../../../generated/prisma/enums";
import { generateAmwalHash } from "../../../libs/amwalhash";
import dotenv from "dotenv";
dotenv.config();

// Util: Verify Amwal MCN notification authenticity
function verifyAmwalNotification(body: any, receivedHash: string): boolean {
	const secret = process.env.AMWAL_SECURE_HASH!;
	// Remove SecureHash from body for verification
	const { SecureHash, ...params } = body;
	const expectedHash = generateAmwalHash(params, secret);
	return expectedHash === receivedHash;
}

// Amwal MCN Webhook Handler
export async function amwalWebhookHandler(req: Request, res: Response) {
	try {
		const body = req.body;
		const receivedHash = body.SecureHash;
		if (!verifyAmwalNotification(body, receivedHash)) {
			console.error("[Amwal MCN] Invalid SecureHash", { receivedHash });
			return res.status(400).json({ success: false, error: "Invalid SecureHash" });
		}

		// Example MCN payload fields: paymentId, status, subscriptionId, eventType, etc.
		const { paymentId, status, subscriptionId, eventType } = body;
		if (!subscriptionId) {
			return res.status(400).json({ success: false, error: "Missing subscriptionId" });
		}


		// Map Amwal status/eventType to your DB enum status
		let newStatus: SubscriptionStatus | null = null;
		if (status === "SUCCESS" || eventType === "PAYMENT_SUCCESS") {
			newStatus = SubscriptionStatus.ACTIVE;
		} else if (status === "FAILED" || eventType === "PAYMENT_FAILED") {
			newStatus = SubscriptionStatus.INCOMPLETE;
		} else if (eventType === "SUBSCRIPTION_CANCELLED") {
			newStatus = SubscriptionStatus.CANCELLED;
		}

		if (newStatus) {
			await prisma.restaurantSubscription.updateMany({
				where: { amwalSubscriptionId: subscriptionId },
				data: {
					status: newStatus,
					updatedAt: new Date(),
				},
			});
			console.log(`[Amwal MCN] Subscription ${subscriptionId} status updated to ${newStatus}`);
		} else {
			console.warn(`[Amwal MCN] Unhandled event/status`, { status, eventType });
		}

		return res.json({ success: true });
	} catch (err: any) {
		console.error("[Amwal MCN] Webhook error", err);
		return res.status(500).json({ success: false, error: err.message });
	}
}
