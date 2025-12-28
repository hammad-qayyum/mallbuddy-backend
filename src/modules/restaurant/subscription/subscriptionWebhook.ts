import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";

export async function subscriptionWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("[Subscription Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing stripe-signature");
  }

  // Get webhook secret - use subscription-specific secret or fallback to main webhook secret
  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("[Subscription Webhook] Missing webhook secret in environment variables");
    return res.status(500).send("Webhook secret not configured");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
    console.log(`[Subscription Webhook] Event received: ${event.type}`, {
      eventId: event.id,
      type: event.type,
    });
  } catch (err: any) {
    console.error("[Subscription Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // All subscription-related events we need to handle
  const events = [
    // Subscription lifecycle
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.trial_will_end",
    // Invoice events
    "invoice.created",
    "invoice.finalized",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.upcoming",
    "invoice.voided",
    "invoice.marked_uncollectible",
    // Payment intent events (for subscription payments)
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.requires_action",
    // Customer events
    "customer.updated",
    "customer.deleted",
    // Setup intent (for saving payment methods)
    "setup_intent.succeeded",
    "setup_intent.setup_failed",
  ];
  
  if (!events.includes(event.type)) {
    console.log(`[Subscription Webhook] Event type not handled: ${event.type}`, {
      eventId: event.id,
    });
    return res.json({ received: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Idempotency check
      const existingEvent = await tx.stripeEvent.findUnique({ where: { id: event.id } });
      if (existingEvent) {
        console.log(`[Subscription Webhook] Event already processed: ${event.id}`);
        return;
      }

      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });

      // Extract subscription from event
      let subscription: Stripe.Subscription;
      if (event.type.startsWith("invoice.")) {
        const invoice = event.data.object as Stripe.Invoice;
        // Invoice.subscription can be string (ID) or Subscription object (when expanded)
        const subscriptionId = (invoice as any).subscription;
        if (!subscriptionId) {
          console.warn(`[Subscription Webhook] Invoice has no subscription: ${invoice.id}`);
          return;
        }
        if (typeof subscriptionId === "string") {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        } else {
          subscription = subscriptionId as Stripe.Subscription;
        }
      } else {
        subscription = event.data.object as Stripe.Subscription;
      }

      // Helper function to calculate end date based on plan interval
      const calculateEndDate = async (planId: string, startDate: Date): Promise<Date> => {
        const plan = await tx.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan) {
          // Default to 1 month if plan not found
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);
          return endDate;
        }
        
        const endDate = new Date(startDate);
        if (plan.interval === "MONTHLY") {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (plan.interval === "YEARLY") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        return endDate;
      };

      // Handle customer.subscription.created - set end date when subscription is created
      if (event.type === "customer.subscription.created") {
        // Check if subscription already exists in DB (might have been created via API)
        let dbSub = await tx.restaurantSubscription.findUnique({ 
          where: { stripeSubscriptionId: subscription.id } 
        });
        
        if (!dbSub) {
          console.warn(`[Subscription Webhook] Subscription not found in database for created event: ${subscription.id}`);
          return;
        }

        // Calculate and set end date if not already set
        if (!dbSub.endDate) {
          const endDate = await calculateEndDate(dbSub.planId, dbSub.startDate);
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { endDate } 
          });
          console.log(`[Subscription Webhook] End date set for subscription: ${dbSub.id} -> ${endDate.toISOString()}`);
        }
        return;
      }

      const dbSub = await tx.restaurantSubscription.findUnique({ 
        where: { stripeSubscriptionId: subscription.id } 
      });
      
      if (!dbSub) {
        console.warn(`[Subscription Webhook] Subscription not found in database: ${subscription.id}`);
        return;
      }

      // Handle all subscription-related events
      switch (event.type) {
        case "invoice.payment_succeeded": {
          // Payment succeeded - subscription is now active
          let endDate = dbSub.endDate;
          if ((subscription as any).current_period_end) {
            endDate = new Date((subscription as any).current_period_end * 1000);
          } else if (!endDate) {
            endDate = await calculateEndDate(dbSub.planId, dbSub.startDate);
          }
          
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { 
              status: "ACTIVE",
              endDate 
            } 
          });
          console.log(`[Subscription Webhook] Payment succeeded - Subscription ACTIVE: ${dbSub.id}, endDate: ${endDate.toISOString()}`);
          break;
        }

        case "invoice.payment_failed": {
          // Payment failed - mark as expired
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "EXPIRED" } 
          });
          console.log(`[Subscription Webhook] Payment failed - Subscription EXPIRED: ${dbSub.id}`);
          break;
        }

        case "invoice.payment_action_required": {
          // Payment requires action (3D Secure, etc.) - keep as incomplete
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "INCOMPLETE" as any } 
          });
          console.log(`[Subscription Webhook] Payment action required - Subscription INCOMPLETE: ${dbSub.id}`);
          break;
        }

        case "invoice.created":
        case "invoice.finalized": {
          // Invoice created/finalized - log but don't change status yet
          console.log(`[Subscription Webhook] Invoice ${event.type}: ${dbSub.id}`);
          break;
        }

        case "invoice.voided":
        case "invoice.marked_uncollectible": {
          // Invoice voided or uncollectible - mark as expired
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "EXPIRED" } 
          });
          console.log(`[Subscription Webhook] Invoice ${event.type} - Subscription EXPIRED: ${dbSub.id}`);
          break;
        }

        case "customer.subscription.deleted": {
          // Subscription deleted/cancelled
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "CANCELLED", endDate: new Date() } 
          });
          console.log(`[Subscription Webhook] Subscription deleted - CANCELLED: ${dbSub.id}`);
          break;
        }

        case "customer.subscription.updated": {
          // Subscription updated - sync status from Stripe
          const stripeStatus = subscription.status;
          let dbStatus: "ACTIVE" | "EXPIRED" | "CANCELLED" | "INCOMPLETE" = "ACTIVE" as any;
          
          if (stripeStatus === "canceled" || stripeStatus === "unpaid") {
            dbStatus = "CANCELLED";
          } else if (stripeStatus === "past_due" || stripeStatus === "incomplete_expired") {
            dbStatus = "EXPIRED";
          } else if (stripeStatus === "incomplete" || stripeStatus === "trialing") {
            dbStatus = "INCOMPLETE";
          } else if (stripeStatus === "active") {
            dbStatus = "ACTIVE";
          }
          
          // Update end date from Stripe current_period_end if available
          let endDate = dbSub.endDate;
          if ((subscription as any).current_period_end) {
            endDate = new Date((subscription as any).current_period_end * 1000);
          } else if (!endDate) {
            endDate = await calculateEndDate(dbSub.planId, dbSub.startDate);
          }
          
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { 
              status: dbStatus,
              endDate 
            } 
          });
          console.log(`[Subscription Webhook] Subscription updated: ${dbSub.id} -> ${dbStatus}, endDate: ${endDate.toISOString()}`);
          break;
        }

        case "customer.subscription.trial_will_end": {
          // Trial ending soon - log for notification
          console.log(`[Subscription Webhook] Trial ending soon for subscription: ${dbSub.id}`);
          break;
        }

        case "payment_intent.succeeded": {
          // Payment intent succeeded - check if it's for a subscription invoice
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const invoiceId = (paymentIntent as any).invoice;
          if (paymentIntent.metadata?.subscriptionId || invoiceId) {
            // This payment is for a subscription - update status
            let endDate = dbSub.endDate;
            if ((subscription as any).current_period_end) {
              endDate = new Date((subscription as any).current_period_end * 1000);
            } else if (!endDate) {
              endDate = await calculateEndDate(dbSub.planId, dbSub.startDate);
            }
            
            await tx.restaurantSubscription.update({ 
              where: { id: dbSub.id }, 
              data: { 
                status: "ACTIVE",
                endDate 
              } 
            });
            console.log(`[Subscription Webhook] Payment intent succeeded - Subscription ACTIVE: ${dbSub.id}`);
          }
          break;
        }

        case "payment_intent.payment_failed": {
          // Payment intent failed
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "EXPIRED" } 
          });
          console.log(`[Subscription Webhook] Payment intent failed - Subscription EXPIRED: ${dbSub.id}`);
          break;
        }

        case "payment_intent.requires_action": {
          // Payment requires action - keep as incomplete
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "INCOMPLETE" as any } 
          });
          console.log(`[Subscription Webhook] Payment requires action - Subscription INCOMPLETE: ${dbSub.id}`);
          break;
        }

        case "invoice.upcoming": {
          // Upcoming invoice - just log, no status change
          console.log(`[Subscription Webhook] Upcoming invoice for subscription: ${dbSub.id}`);
          break;
        }

        case "setup_intent.succeeded": {
          // Payment method setup succeeded - log
          console.log(`[Subscription Webhook] Setup intent succeeded for subscription: ${dbSub.id}`);
          break;
        }

        case "setup_intent.setup_failed": {
          // Payment method setup failed - keep as incomplete
          await tx.restaurantSubscription.update({ 
            where: { id: dbSub.id }, 
            data: { status: "INCOMPLETE" as any } 
          });
          console.log(`[Subscription Webhook] Setup intent failed - Subscription INCOMPLETE: ${dbSub.id}`);
          break;
        }

        case "customer.updated":
        case "customer.deleted": {
          // Customer updated/deleted - log but subscription status unchanged
          console.log(`[Subscription Webhook] Customer ${event.type} for subscription: ${dbSub.id}`);
          break;
        }

        default: {
          console.log(`[Subscription Webhook] Unhandled event type in switch: ${event.type}`, {
            eventId: event.id,
            subscriptionId: dbSub.id,
          });
        }
      }
    });

    console.log(`[Subscription Webhook] Event processed successfully: ${event.type}`);
  } catch (err: any) {
    console.error("[Subscription Webhook] Error processing webhook:", {
      error: err.message,
      stack: err.stack,
      eventId: event?.id,
    });
    return res.status(500).send("Internal Server Error");
  }

  res.json({ received: true });
}
