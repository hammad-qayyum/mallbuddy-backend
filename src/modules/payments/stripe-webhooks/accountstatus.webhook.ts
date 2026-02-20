import { Request, Response } from "express";
import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";

export const handleStripeAccountWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  
  if (!sig) {
    console.error("[Account Webhook] Missing stripe-signature header");
    return res.status(400).send("Missing stripe-signature");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET!
    );
    console.log(`[Account Webhook] Event received: ${event.type}`, {
      eventId: event.id,
      type: event.type,
    });
  } catch (err: any) {
    console.error("[Account Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Ignore events without a valid Stripe Account object
  const account = event.data?.object as { id?: string } | undefined;
  if (!account?.id || !account.id.startsWith("acct_")) {
    console.log("[Account Webhook] Ignoring non-account event:", account?.id);
    return res.json({ received: true });
  }

  try {
    // Handle both relevant events
    if (["account.updated", "account.application.authorized"].includes(event.type)) {
      const account = event.data.object as import("stripe").Stripe.Account;

      console.log(`[Account Webhook] Processing account event`, {
        eventId: event.id,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due?.length || 0,
        disabledReason: account.requirements?.disabled_reason,
      });

      // ✅ IDEMPOTENCY CHECK: Prevent processing the same event twice
      let existingEvent;
      try {
        existingEvent = await prisma.stripeEvent.findUnique({
          where: { id: event.id },
        });
      } catch (dbError: any) {
        // Handle database connection errors gracefully
        console.error("[Account Webhook] Database connection error during idempotency check:", {
          error: dbError.message,
          eventId: event.id,
        });
        // If DB is down, we can't verify idempotency, but we should still respond to Stripe
        // Stripe will retry if we return an error, so we'll log and continue
        // In production, you might want to queue this for retry
        console.warn("[Account Webhook] Continuing without idempotency check due to DB error");
      }
      
      if (existingEvent) {
        console.log(`[Account Webhook] Event already processed, skipping: ${event.id}`, {
          eventId: event.id,
          type: event.type,
        });
        return res.json({ received: true });
      }

      // Determine status with improved logic
      let status: "pending" | "completed" | "rejected" = "pending";

      if (account.charges_enabled && account.payouts_enabled) {
        status = "completed";
        console.log(`[Account Webhook] Account fully enabled - setting status to completed`);
      } else if (account.requirements?.disabled_reason) {
        status = "rejected";
        console.log(`[Account Webhook] Account disabled - setting status to rejected`, {
          reason: account.requirements.disabled_reason,
        });
      } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
        status = "pending";
        console.log(`[Account Webhook] Account has pending requirements - setting status to pending`, {
          currentlyDue: account.requirements.currently_due.length,
        });
      } else {
        // If charges or payouts not enabled but no requirements due, still pending
        status = "pending";
        console.log(`[Account Webhook] Account not fully enabled - setting status to pending`, {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });
      }

      // Check if a bank account exists
      const bankAccountAdded =
        Array.isArray(account.external_accounts?.data) &&
        account.external_accounts.data.length > 0;

      // ✅ FIX: Use findUnique instead of findFirst (field is unique in schema)
      const existingRestaurant = await prisma.restaurant.findUnique({
        where: { stripeConnectAccountId: account.id },
        select: { userId: true, stripeConnectAccountId: true },
      });

      if (!existingRestaurant) {
        // ⚠️ ORPHAN ACCOUNT DETECTED: Account exists in Stripe but not in our database
        // This is an orphan account - likely created manually in Stripe or from old code
        // Webhook will NOT create accounts - it only updates existing ones
        console.warn(`[Account Webhook] ⚠️ ORPHAN ACCOUNT IGNORED: Account ${account.id} exists in Stripe but not in database`, {
          eventId: event.id,
          accountId: account.id,
          message: "Webhook only updates existing accounts. This orphan account will be ignored.",
        });
        // Record the event for idempotency (so we don't process it again)
        try {
          await prisma.stripeEvent.create({
            data: {
              id: event.id,
              type: event.type,
            },
          });
        } catch (dbError: any) {
          console.error("[Account Webhook] Failed to record event (DB error):", {
            error: dbError.message,
            eventId: event.id,
          });
        }
        // Return success to Stripe (we've handled the event, just ignored it)
        return res.json({ received: true });
      }

      // ✅ Use transaction for atomicity and idempotency
      try {
        await prisma.$transaction(async (tx) => {
          // Record event for idempotency (double-check inside transaction)
          const eventExists = await tx.stripeEvent.findUnique({
            where: { id: event.id },
          });
          if (!eventExists) {
            await tx.stripeEvent.create({
              data: {
                id: event.id,
                type: event.type,
              },
            });
          }

          // ✅ FIX: Use update instead of updateMany (more precise, field is unique)
          await tx.restaurant.update({
            where: { stripeConnectAccountId: account.id },
            data: {
              stripeAccountStatus: status,
              bankAccountAdded,
            },
          });
        });
      } catch (dbError: any) {
        // Handle database errors gracefully
        console.error("[Account Webhook] Database error during transaction:", {
          error: dbError.message,
          eventId: event.id,
          accountId: account.id,
        });
        // Re-throw to be caught by outer catch block
        throw dbError;
      }

      console.log(`[Account Webhook] Webhook processed successfully`, {
        eventId: event.id,
        accountId: account.id,
        restaurantId: existingRestaurant.userId,
        status: status,
        bankAccountAdded,
      });
    } else {
      console.log(`[Account Webhook] Event type not handled: ${event.type}`);
      // Record unhandled events for idempotency
      try {
        await prisma.stripeEvent.create({
          data: {
            id: event.id,
            type: event.type,
          },
        });
      } catch (dbError: any) {
        console.error("[Account Webhook] Failed to record unhandled event (DB error):", {
          error: dbError.message,
          eventId: event.id,
        });
      }
    }
  } catch (err: any) {
    console.error("[Account Webhook] Error processing webhook:", {
      error: err.message,
      stack: err.stack,
      eventId: event?.id,
    });
    return res.status(500).send("Internal Server Error");
  }

  res.json({ received: true });
};