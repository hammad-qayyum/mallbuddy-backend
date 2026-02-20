import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";

/**
 * Refund an order payment
 * @param orderId - Order ID to refund
 * @param amount - Optional refund amount in cents (if not provided, full refund)
 * @param userId - User ID requesting the refund (for authorization)
 * @param userRole - User role (for authorization)
 */
export async function refundOrder(
  orderId: string,
  amount: number | undefined,
  userId?: string,
  userRole?: string
) {
  // Log refund attempt
  console.log(`[Refund] Attempting refund for order ${orderId}`, {
    orderId,
    amount,
    userId,
    userRole,
    timestamp: new Date().toISOString(),
  });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      restaurant: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!order) {
    console.error(`[Refund] Order not found: ${orderId}`);
    throw new Error("Order not found");
  }

  // Handle COD refunds differently
  if (order.paymentMethod === "CASH") {
    return handleCODRefund(order, amount, userId, userRole);
  }

  // For non-COD orders, require Stripe payment intent
  if (!order.stripePaymentIntentId) {
    console.error(`[Refund] No payment intent found for order: ${orderId}`);
    throw new Error("No payment to refund");
  }

  if (order.paymentStatus !== "PAID") {
    console.error(`[Refund] Order not paid, status: ${order.paymentStatus}`, { orderId });
    throw new Error("Order is not refundable");
  }

  // Authorization check: Only ADMIN, RESTAURANT owner, or order owner can refund
  if (userId && userRole) {
    const isAdmin = userRole === "ADMIN";
    const isRestaurantOwner = userRole === "RESTAURANT" && order.restaurant?.userId === userId;
    const isOrderOwner = order.userId === userId;

    if (!isAdmin && !isRestaurantOwner && !isOrderOwner) {
      console.error(`[Refund] Unauthorized refund attempt`, {
        orderId,
        userId,
        userRole,
        orderOwnerId: order.userId,
        restaurantOwnerId: order.restaurant?.userId,
      });
      throw new Error("Unauthorized: You do not have permission to refund this order");
    }
  }

  // Validate refund amount doesn't exceed order total
  const orderTotalInCents = Math.round(Number(order.total) * 100);
  if (amount !== undefined) {
    if (amount > orderTotalInCents) {
      console.error(`[Refund] Refund amount exceeds order total`, {
        orderId,
        refundAmount: amount,
        orderTotal: orderTotalInCents,
      });
      throw new Error("Refund amount cannot exceed order total");
    }
    if (amount <= 0) {
      throw new Error("Refund amount must be positive");
    }
  }

  // Get PaymentIntent to verify it exists
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  } catch (error: any) {
    console.error(`[Refund] Failed to retrieve payment intent`, {
      orderId,
      paymentIntentId: order.stripePaymentIntentId,
      error: error.message,
    });
    throw new Error("Failed to retrieve payment information");
  }

  if (!paymentIntent.latest_charge) {
    console.error(`[Refund] No charge found for payment intent`, {
      orderId,
      paymentIntentId: order.stripePaymentIntentId,
    });
    throw new Error("No charge found");
  }

  // Build refund parameters - only include amount if provided (for partial refunds)
  const refundParams: any = {
    payment_intent: order.stripePaymentIntentId,
    metadata: {
      orderId: order.id,
      refundedBy: userId || "system",
    },
  };

  // Only include amount if provided (for partial refunds)
  if (amount !== undefined) {
    refundParams.amount = Math.round(amount);
  }

  // Create refund in Stripe
  let refund;
  try {
    console.log(`[Refund] Creating refund in Stripe`, {
      orderId,
      amount: refundParams.amount || "full",
      paymentIntentId: order.stripePaymentIntentId,
    });

    refund = await stripe.refunds.create(refundParams);

    console.log(`[Refund] Refund created successfully`, {
      orderId,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error: any) {
    console.error(`[Refund] Stripe API error`, {
      orderId,
      error: error.message,
      stripeError: error.type,
    });
    throw new Error(`Failed to process refund: ${error.message}`);
  }

  return refund;
}

/**
 * Handle COD (Cash on Delivery) refunds
 * For COD orders, we only update the payment status - actual cash return is manual
 */
async function handleCODRefund(
  order: any,
  amount: number | undefined,
  userId?: string,
  userRole?: string
) {
  console.log(`[Refund] Processing COD refund for order ${order.id}`, {
    orderId: order.id,
    amount,
    userId,
    userRole,
  });

  // Validation
  if (order.paymentStatus !== "PAID") {
    console.error(`[Refund] COD order not paid, status: ${order.paymentStatus}`, {
      orderId: order.id,
    });
    throw new Error("Order is not refundable - payment not collected");
  }

  // Authorization check
  if (userId && userRole) {
    const isAdmin = userRole === "ADMIN";
    const isRestaurantOwner = userRole === "RESTAURANT" && order.restaurant?.userId === userId;

    if (!isAdmin && !isRestaurantOwner ) {
      console.error(`[Refund] Unauthorized COD refund attempt`, {
        orderId: order.id,
        userId,
        userRole,
        orderOwnerId: order.userId,
        restaurantOwnerId: order.restaurant?.userId,
      });
      throw new Error("Unauthorized: You do not have permission to refund this order");
    }
  }

  // Calculate refund amount
  const refundAmount = amount ? amount / 100 : Number(order.total); // Convert cents to dollars if amount provided

  // Validate amount
  if (refundAmount > Number(order.total)) {
    console.error(`[Refund] COD refund amount exceeds order total`, {
      orderId: order.id,
      refundAmount,
      orderTotal: Number(order.total),
    });
    throw new Error("Refund amount cannot exceed order total");
  }

  // Update order payment status to REFUNDED
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "REFUNDED",
    },
  });

  console.log(`[Refund] COD refund processed successfully`, {
    orderId: order.id,
    refundAmount,
    note: "Manual cash return required",
  });

  // Return refund record (similar structure to Stripe refund for consistency)
  return {
    id: `cod_refund_${order.id}_${Date.now()}`,
    amount: Math.round(refundAmount * 100), // Return in cents for consistency
    status: "succeeded", // COD refunds are immediate (status update only)
    orderId: order.id,
    type: "COD",
    note: "Manual cash return required - refund status updated in system",
  };
}
