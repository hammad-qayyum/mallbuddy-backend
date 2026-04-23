import { Request, Response } from "express";
import prisma from "../../config/prisma";
import dotenv from "dotenv";
dotenv.config();

// Amwal webhook handler for legacy MID/TID flow
export const amwalWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    console.log("[Amwal Webhook] Received:", body);
    const { order_id, status, transaction_id } = body;
    if (!order_id) return res.status(400).send("Missing order_id");

    // Optionally verify hash if Amwal provides it
    // const { SecureHash, ...params } = body;
    // if (SecureHash && !verifyHash(params, SecureHash)) return res.status(400).send("Invalid hash");

    const sub = await prisma.restaurantSubscription.findUnique({ where: { id: order_id } });
    if (!sub) return res.status(404).send("Subscription not found");

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
    return res.status(200).send("OK");
  } catch (err: any) {
    console.error("[Amwal Webhook] Error", err);
    return res.status(500).send("ERROR");
  }
};
