import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";

export async function stripeWebhookHandler(
  req: Request,
  res: Response
) {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing stripe-signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`[Webhook] Event received: ${event.type}`, {
      eventId: event.id,
      type: event.type,
    });
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed", {
      error: err.message,
      timestamp: new Date().toISOString(),
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Only handle relevant events
  const allowedEvents = [
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "charge.refunded",
    "refund.updated",
  ];
  if (!allowedEvents.includes(event.type)) {
    console.log(`[Webhook] Event type not handled, ignoring: ${event.type}`, {
      eventId: event.id,
    });
    return res.json({ received: true });
  }

  // 1️⃣ Idempotency check
  const existingEvent = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
  });
  if (existingEvent) {
    console.log(`[Webhook] Event already processed, skipping: ${event.id}`, {
      eventId: event.id,
      type: event.type,
    });
    return res.json({ received: true });
  }

  // 2️⃣ Transactional handling
  await prisma.$transaction(async (tx) => {
    // Record event for idempotency
    await tx.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
      },
    });

    // Extract orderId from event metadata (works for payment events)
    let orderId: string | undefined;
    if (event.type.startsWith("payment_intent.")) {
      const intent = event.data.object as Stripe.PaymentIntent;
      orderId = intent.metadata?.orderId;
    } else if (event.type === "charge.refunded" || event.type === "refund.updated") {
      const charge = event.data.object as Stripe.Charge;
      // For refund events, we need to find order by payment intent ID
      const paymentIntentId = typeof charge.payment_intent === "string" 
        ? charge.payment_intent 
        : (charge.payment_intent as Stripe.PaymentIntent)?.id;
      
      if (paymentIntentId) {
        const order = await tx.order.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
          select: { id: true },
        });
        orderId = order?.id;
      }
    }

    // Log webhook event processing
    console.log(`[Webhook] Processing event ${event.type}`, {
      eventId: event.id,
      orderId,
      timestamp: new Date().toISOString(),
    });

    switch (event.type) {
      /* ---------------- PAYMENT ---------------- */
      case "payment_intent.succeeded": {
        if (!orderId) {
          console.warn(`[Webhook] payment_intent.succeeded: No orderId in metadata`, {
            eventId: event.id,
          });
          return;
        }

        const order = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          console.warn(`[Webhook] payment_intent.succeeded: Order not found`, {
            eventId: event.id,
            orderId,
          });
          return;
        }

        // Prevent status overwrite for already PAID orders
        if (order.paymentStatus === "PAID") {
          console.log(`[Webhook] payment_intent.succeeded: Order already paid, skipping`, {
            eventId: event.id,
            orderId,
          });
          return;
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
          },
        });

        console.log(`[Webhook] payment_intent.succeeded: Order marked as paid`, {
          eventId: event.id,
          orderId,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        if (!orderId) {
          console.warn(`[Webhook] payment_intent.payment_failed: No orderId in metadata`, {
            eventId: event.id,
          });
          return;
        }

        const order = await tx.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          console.warn(`[Webhook] payment_intent.payment_failed: Order not found`, {
            eventId: event.id,
            orderId,
          });
          return;
        }

        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: "FAILED" },
        });

        console.log(`[Webhook] payment_intent.payment_failed: Order marked as failed`, {
          eventId: event.id,
          orderId,
        });
        break;
      }

      /* ---------------- REFUNDS ---------------- */
      case "charge.refunded":
      case "refund.updated": {
        if (!orderId) {
          console.warn(`[Webhook] ${event.type}: No order found for payment intent`, {
            eventId: event.id,
          });
          return;
        }

        const charge = event.data.object as Stripe.Charge;
        const refundAmount = charge.amount_refunded || 0;
        const chargeAmount = charge.amount || 0;
        const isFullRefund = refundAmount === chargeAmount;

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "REFUNDED",
          },
        });

        console.log(`[Webhook] ${event.type}: Order marked as refunded`, {
          eventId: event.id,
          orderId,
          refundAmount,
          chargeAmount,
          isFullRefund,
        });
        break;
      }
    }
  });

  console.log(`[Webhook] Event processed successfully: ${event.type}`, {
    eventId: event.id,
  });

  res.json({ received: true });
}
