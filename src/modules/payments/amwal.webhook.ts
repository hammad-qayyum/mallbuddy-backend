import { Request, Response } from "express";
import prisma from "../../config/prisma";
import dotenv from "dotenv";
import { generateAmwalHash } from "../../libs/amwalhash";
dotenv.config();

const SUCCESS_RESPONSE_CODE = "00";
const AMWAL_RESPONSE_BODY = { message: "success", success: true } as const;

// Amwal's docs show the cloud notification in PascalCase, but their actual
// payloads (and the SmartBox `completeCallback`) use camelCase. Read both.
function pickField<T = unknown>(body: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = body[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function verifySecureHash(body: Record<string, unknown>): boolean {
  const secret = process.env.AMWAL_SECURE_HASH;
  if (!secret) {
    throw new Error("Missing AMWAL_SECURE_HASH environment variable");
  }

  const receivedHash = pickField<string>(body, "SecureHash", "secureHash", "secureHashValue");
  if (!receivedHash) return false;

  const HASH_KEYS = new Set(["SecureHash", "secureHash", "secureHashValue"]);
  const fieldsForHash: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!HASH_KEYS.has(key)) fieldsForHash[key] = value;
  }

  const expected = generateAmwalHash(fieldsForHash, secret);
  return expected === String(receivedHash).toUpperCase();
}

function computeEndDate(start: Date, interval: string): Date {
  const end = new Date(start);
  if (interval === "YEARLY") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export const amwalWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    console.log("[Amwal Webhook] Received:", JSON.stringify(body));

    const merchantReference = pickField<string>(body, "MerchantReference", "merchantReference");
    const systemReference = pickField<string>(body, "SystemReference", "systemReference");
    const responseCode = pickField<string>(body, "ResponseCode", "responseCode");
    const message = pickField<string>(body, "Message", "message");

    if (!verifySecureHash(body)) {
      console.error("[Amwal Webhook] Invalid SecureHash", { merchantReference, systemReference });
      return res.status(200).json({ message: "invalid hash", success: false });
    }

    if (!merchantReference) {
      console.error("[Amwal Webhook] Missing merchantReference");
      return res.status(200).json(AMWAL_RESPONSE_BODY);
    }

    const sub = await prisma.restaurantSubscription.findUnique({
      where: { id: merchantReference },
      include: { plan: true },
    });
    if (!sub) {
      console.error("[Amwal Webhook] Subscription not found", { merchantReference });
      return res.status(200).json(AMWAL_RESPONSE_BODY);
    }

    const isSuccess = responseCode === SUCCESS_RESPONSE_CODE;

    if (isSuccess) {
      const startDate = sub.startDate ?? new Date();
      const endDate = computeEndDate(startDate, sub.plan.interval);
      await prisma.restaurantSubscription.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          endDate,
          amwalSubscriptionId: systemReference ?? null,
        },
      });
      console.log("[Amwal Webhook] Activated subscription", { id: sub.id, endDate });
    } else {
      await prisma.restaurantSubscription.update({
        where: { id: sub.id },
        data: { status: "INCOMPLETE" },
      });
      console.log("[Amwal Webhook] Marked subscription INCOMPLETE", {
        id: sub.id,
        responseCode,
        message,
      });
    }

    return res.status(200).json(AMWAL_RESPONSE_BODY);
  } catch (err: any) {
    console.error("[Amwal Webhook] Error", err);
    return res.status(500).json({ message: err.message, success: false });
  }
};
