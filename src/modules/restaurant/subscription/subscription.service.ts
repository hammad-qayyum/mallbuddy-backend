import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";
import Stripe from "stripe";

/**
 * Create subscription
 */
export async function createRestaurantSubscription(restaurantId: string, planId: string) {
  const restaurant = await prisma.restaurant.findUnique({ 
    where: { userId: restaurantId },
  });
  if (!restaurant) throw new Error("Restaurant not found");

  // Check if restaurant has a Connect account
  if (!restaurant.stripeConnectAccountId) {
    throw new Error("Restaurant must have a Stripe Connect account to subscribe. Please complete onboarding first.");
  }

  // Verify Connect account is active
  try {
    const connectAccount = await stripe.accounts.retrieve(restaurant.stripeConnectAccountId);
    if (!connectAccount.charges_enabled) {
      throw new Error("Restaurant Connect account is not fully activated. Please complete onboarding.");
    }
  } catch (error: any) {
    throw new Error(`Failed to verify Connect account: ${error.message}`);
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");
  if (!plan.stripePriceId) throw new Error("Plan is not linked with Stripe Price");

  // Create Stripe customer on MAIN account (not Connect account)
  // The subscription will be on the main account, but we'll set up payment from Connect account
  let customerId = restaurant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ 
      metadata: { 
        restaurantId,
        connectAccountId: restaurant.stripeConnectAccountId,
      },
    });
    customerId = customer.id;
    await prisma.restaurant.update({ 
      where: { userId: restaurantId }, 
      data: { stripeCustomerId: customerId } 
    });
  }

  // Create Stripe subscription on MAIN account
  // The subscription will charge the Connect account via payment method setup
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: ["card"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      restaurantId,
      planId,
      connectAccountId: restaurant.stripeConnectAccountId,
    },
    // Note: Payment method must be attached separately from Connect account
    // Frontend will need to collect payment method and attach it to this customer
  });

  // Calculate end date based on interval
  const startDate = new Date();
  let endDate: Date;
  if (plan.interval === "MONTHLY") {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (plan.interval === "YEARLY") {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    // Default to 1 month if unknown interval
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Extract payment intent client secret for frontend payment completion
  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined;
  const clientSecret = paymentIntent?.client_secret || null;

  // Save in DB with calculated end date
  // Status starts as INCOMPLETE until payment is confirmed
  const dbSub = await prisma.restaurantSubscription.create({
    data: {
      restaurantId,
      planId,
      stripeSubscriptionId: subscription.id,
      startDate,
      endDate,
      status: "INCOMPLETE" as any, // Will be updated to ACTIVE when payment succeeds via webhook
    },
  });

  console.log(`[Subscription] Created subscription for restaurant ${restaurantId}`, {
    subscriptionId: subscription.id,
    dbSubscriptionId: dbSub.id,
    status: "INCOMPLETE",
    clientSecret: clientSecret ? "present" : "missing",
  });

  return { 
    dbSub, 
    stripeSubscription: subscription,
    clientSecret, // Return client secret for frontend payment completion
  };
}

/**
 * Attach payment method to subscription customer
 * This allows the subscription to charge the restaurant's payment method
 */
export async function attachPaymentMethodToSubscription(
  restaurantId: string,
  paymentMethodId: string
) {
  const restaurant = await prisma.restaurant.findUnique({ 
    where: { userId: restaurantId },
  });
  if (!restaurant) throw new Error("Restaurant not found");
  if (!restaurant.stripeCustomerId) throw new Error("Restaurant has no Stripe customer");

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: restaurant.stripeCustomerId,
  });

  // Set as default payment method
  await stripe.customers.update(restaurant.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Get active subscription for this restaurant
  const activeSubscription = await prisma.restaurantSubscription.findFirst({
    where: {
      restaurantId,
      status: { in: ["INCOMPLETE" as any, "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeSubscription?.stripeSubscriptionId) {
    // Update subscription to use this payment method
    await stripe.subscriptions.update(activeSubscription.stripeSubscriptionId, {
      default_payment_method: paymentMethodId,
    });

    // Try to pay the latest invoice if it exists
    try {
      const subscription = await stripe.subscriptions.retrieve(
        activeSubscription.stripeSubscriptionId,
        { expand: ["latest_invoice"] }
      );
      
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntentId = (invoice as any)?.payment_intent;
      if (invoice && invoice.status === "open" && paymentIntentId) {
        const paymentIntent = typeof paymentIntentId === "string" 
          ? await stripe.paymentIntents.retrieve(paymentIntentId)
          : paymentIntentId as Stripe.PaymentIntent;
        if (paymentIntent.status === "requires_payment_method") {
          // Confirm the payment intent with the new payment method
          await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method: paymentMethodId,
          });
        }
      }
    } catch (error: any) {
      console.warn(`[Subscription] Could not auto-pay invoice: ${error.message}`);
      // Not critical - webhook will handle it
    }
  }

  return { success: true };
}

/**
 * Update subscription plan
 */
export async function updateRestaurantSubscription(subscriptionId: string, newPlanId: string) {
  const sub = await prisma.restaurantSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Subscription not found");

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
  if (!plan || !plan.stripePriceId) throw new Error("New plan invalid");

  // Update Stripe subscription - get current subscription item first
  const currentSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId!);
  const subscriptionItemId = currentSub.items.data[0]?.id;
  
  if (!subscriptionItemId) {
    throw new Error("No subscription item found to update");
  }
  
  // Update Stripe subscription
  const stripeSub = await stripe.subscriptions.update(sub.stripeSubscriptionId!, {
    items: [{ id: subscriptionItemId, price: plan.stripePriceId }],
  });

  // Update DB
  const dbSub = await prisma.restaurantSubscription.update({
    where: { id: subscriptionId },
    data: { planId: newPlanId },
  });

  return { dbSub, stripeSub };
}

/**
 * Cancel subscription
 */
export async function cancelRestaurantSubscription(subscriptionId: string) {
  const sub = await prisma.restaurantSubscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("Subscription not found");

  // Cancel Stripe subscription (immediately)
  const stripeSub = await stripe.subscriptions.cancel(sub.stripeSubscriptionId!);

  // Update DB
  const dbSub = await prisma.restaurantSubscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", endDate: new Date() },
  });

  return { dbSub, stripeSub };
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
