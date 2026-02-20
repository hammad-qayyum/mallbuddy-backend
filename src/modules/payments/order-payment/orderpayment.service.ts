import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";
import { auth } from "../../../libs/betterauth";
import { Request } from "express";
import dotenv from "dotenv";
dotenv.config();

export async function createStripePaymentIntent(req: Request, orderId: string) {
  // Fetch order with user and restaurant (needed for Connect payments)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { 
      user: true, // so we can attach to customer
      restaurant: true, // needed to check for Stripe Connect account
    },
  });

  if (!order) {
    console.error(`[Payment Intent] Order not found: ${orderId}`);
    throw new Error("Order not found");
  }
  
  if (!order.user.stripeCustomerId) {
    console.error(`[Payment Intent] User has no Stripe customer ID`, {
      orderId,
      userId: order.userId,
    });
    throw new Error("User does not have a Stripe customer ID. Please add a payment method first.");
  }

  // Store customer ID after validation (TypeScript now knows it's not null)
  const customerId = order.user.stripeCustomerId;

  if (order.paymentMethod !== "CARD") {
    console.error(`[Payment Intent] Invalid payment method`, {
      orderId,
      paymentMethod: order.paymentMethod,
    });
    throw new Error("Order payment method is not CARD");
  }
  if (order.userId !== (req as any).auth?.user?.id) {
    console.error(`[Payment Intent] Unauthorized payment attempt`, {
      orderId,
      orderUserId: order.userId,
      requestUserId: (req as any).auth?.user?.id,
    });
    throw new Error("You are not authorized to pay for this order.");
  }
  if (order.paymentStatus === "PAID") {
    console.error(`[Payment Intent] Order already paid`, {
      orderId,
      paymentStatus: order.paymentStatus,
    });
    throw new Error("Order already paid");
  }

  // Get currency from environment variable, default to USD
  const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

  // Log payment intent creation attempt
  console.log(`[Payment Intent] Creating payment intent for order ${orderId}`, {
    orderId,
    userId: order.userId,
    restaurantId: order.restaurantId,
    amount: order.total,
    currency,
    paymentMethod: order.paymentMethod,
  });

  // Stripe expects amount in cents
  const amountInCents = Math.round(Number(order.total) * 100);

  // BEFORE creating a new PaymentIntent, check if one already exists
  if (order.stripePaymentIntentId) {
    const existingPI = await stripe.paymentIntents.retrieve(
      order.stripePaymentIntentId
    );
  
    // If the existing PaymentIntent can still be used, return its client secret
    if (
      existingPI.status === "requires_payment_method" ||
      existingPI.status === "requires_confirmation"
    ) {
      return existingPI.client_secret;
    }
  }
  
  // Determine if this is a Connect payment (restaurant has Stripe Connect account)
  const isConnectPayment = order.restaurant?.stripeConnectAccountId && 
                           order.restaurant?.stripeAccountStatus === "completed";

  let paymentIntent;

  if (isConnectPayment) {
    // Create PaymentIntent with Stripe Connect (split payment)
    // Calculate platform commission (use restaurant's rate or default from env)
    const defaultCommissionRate = Number(process.env.DEFAULT_COMMISSION_RATE );
    const commission = Math.round(amountInCents * (order.restaurant.commissionRate ?? defaultCommissionRate));

    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      customer: order.user.stripeCustomerId!,
      automatic_payment_methods: {
        enabled: true, // lets Stripe handle card types
        allow_redirects: "never",
      },
      metadata: {
        orderId: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId, // useful for Connect payments
      },
      // Stripe Connect: transfer funds to restaurant's account
      transfer_data: {
        destination: order.restaurant.stripeConnectAccountId!,
      },
      // Platform commission fee
      application_fee_amount: commission,
    }, {
      idempotencyKey: `order_${order.id}`, // ensures no duplicate PaymentIntents
    });
  } else {
    // Regular PaymentIntent (no Connect - funds go to platform account)
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true, // lets Stripe handle card types
        allow_redirects: "never",
      },
      metadata: {
        orderId: order.id,
        userId: order.userId,
        restaurantId: order.restaurantId,
      },
    }, {
      idempotencyKey: `order_${order.id}`, // ensures no duplicate PaymentIntents
    });
  }

  // Save PaymentIntent ID to order
  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  console.log(`[Payment Intent] Payment intent created successfully`, {
    orderId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    isConnectPayment,
  });

  return paymentIntent.client_secret;
}
