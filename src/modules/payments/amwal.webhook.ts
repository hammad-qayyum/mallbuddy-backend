import { Request, Response } from "express";
import prisma from "../../config/prisma";
import dotenv from "dotenv";
import { generateAmwalHash } from "../../libs/amwalhash";
dotenv.config();

// Cloud-notification payload Amwal POSTs to our webhook URL.
// Per https://amwalpay.om/developers/merchant-cloud-notification/
interface AmwalCloudNotification {
  MerchantId: number;
  TerminalId: number;
  AuthorizationDateTime: string;
  DateTimeLocalTrxn: string;
  SecureHash: string;
  Message: string;
  TxnType: string;
  PaidThrough?: string;
  SystemReference: string;
  Amount: number;
  CurrencyId: number;
  ResponseCode?: string;
  MerchantReference?: string;
  UDF?: string;
  [key: string]: unknown;
}

const SUCCESS_RESPONSE_CODE = "00";

const AMWAL_RESPONSE_BODY = { message: "success", success: true } as const;

function verifySecureHash(body: AmwalCloudNotification): boolean {
  const secret = process.env.AMWAL_SECURE_HASH;
  if (!secret) {
    throw new Error("Missing AMWAL_SECURE_HASH environment variable");
  }
  const { SecureHash, ...rest } = body;
  if (!SecureHash) return false;
  const expected = generateAmwalHash(rest, secret);
  return expected === String(SecureHash).toUpperCase();
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
    const body = req.body as AmwalCloudNotification;
    console.log("[Amwal Webhook] Received:", JSON.stringify(body));

    if (!verifySecureHash(body)) {
      console.error("[Amwal Webhook] Invalid SecureHash", {
        merchantReference: body.MerchantReference,
        systemReference: body.SystemReference,
      });
      return res.status(200).json({ message: "invalid hash", success: false });
    }

    const merchantReference = body.MerchantReference;
    if (!merchantReference) {
      console.error("[Amwal Webhook] Missing MerchantReference");
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

    const isSuccess = body.ResponseCode === SUCCESS_RESPONSE_CODE;

    if (isSuccess) {
      const startDate = sub.startDate ?? new Date();
      const endDate = computeEndDate(startDate, sub.plan.interval);
      await prisma.restaurantSubscription.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          endDate,
          amwalSubscriptionId: body.SystemReference,
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
        responseCode: body.ResponseCode,
        message: body.Message,
      });
    }

    return res.status(200).json(AMWAL_RESPONSE_BODY);
  } catch (err: any) {
    console.error("[Amwal Webhook] Error", err);
    return res.status(500).json({ message: err.message, success: false });
  }
};
