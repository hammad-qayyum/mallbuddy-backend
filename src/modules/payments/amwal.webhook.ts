import { Request, Response } from "express";
import prisma from "../../config/prisma";
import dotenv from "dotenv";
import { generateAmwalHash } from "../../libs/amwalhash";
dotenv.config();

function verifyAmwalNotification(body: Record<string, unknown>): boolean {
  const receivedHash = body.SecureHash ?? body.secureHashValue;
  if (!receivedHash) {
    return true;
  }

  const secret = process.env.AMWAL_SECURE_HASH;
  if (!secret) {
    throw new Error("Missing AMWAL_SECURE_HASH environment variable");
  }

  const { SecureHash, secureHashValue, ...params } = body;
  const expectedHash = generateAmwalHash(params, secret);
  return expectedHash === String(receivedHash).toUpperCase();
}

// Amwal webhook handler for legacy MID/TID flow
export const amwalWebhook = async (req: Request, res: Response) => {
  try {
  const body = req.body as Record<string, unknown>;
    console.log("[Amwal Webhook] Received:", body);
  // coerce and validate incoming fields to known primitive types
  const rawOrderId = (body as any).order_id;
  const order_id = typeof rawOrderId === "string" ? rawOrderId : String(rawOrderId ?? "");
  const status = typeof (body as any).status === "string" ? (body as any).status : String((body as any).status ?? "");
  const transaction_id = typeof (body as any).transaction_id === "string" ? (body as any).transaction_id : String((body as any).transaction_id ?? "");

  if (!order_id) {
    return res.status(400).json({ success: false, message: "Missing order_id" });
  }

  if (!verifyAmwalNotification(body)) {
    console.error("[Amwal Webhook] Invalid SecureHash", { order_id, transaction_id });
    return res.status(200).json({ success: false, message: "invalid hash" });
  }

    const sub = await prisma.restaurantSubscription.findUnique({ where: { id: order_id } });
  if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });

    if (status === "SUCCESS") {
      await prisma.restaurantSubscription.update({
        where: { id: order_id },
        data: {
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.restaurantSubscription.update({
        where: { id: order_id },
        data: {
          status: "INCOMPLETE",
          updatedAt: new Date(),
        },
      });
    }
    return res.status(200).json({ success: true, message: "success" });
  } catch (err: any) {
    console.error("[Amwal Webhook] Error", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
