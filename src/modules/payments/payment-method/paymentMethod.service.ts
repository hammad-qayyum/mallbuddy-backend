import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";

/**
 * Attach a Stripe payment method to a user
 * This is used ONLY for CARD payments
 */
export async function attachPaymentMethodToUser(
  userId: string,
  stripeCustomerId: string,
  paymentMethodId: string
) {
  // 1️⃣ Attach payment method to Stripe customer
  const paymentMethod = await stripe.paymentMethods.attach(
    paymentMethodId,
    { customer: stripeCustomerId }
  );

  // 2️⃣ Check if user already has a default payment method
  const existingDefault = await prisma.userPaymentMethod.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });

  // 3️⃣ Save payment method in DB
  return prisma.userPaymentMethod.create({
    data: {
      userId,
      stripePmId: paymentMethod.id,
      brand: paymentMethod.card?.brand || null,
      last4: paymentMethod.card?.last4 || null,
      expMonth: paymentMethod.card?.exp_month || null,
      expYear: paymentMethod.card?.exp_year || null,

      // ✅ First card becomes default automatically
      isDefault: existingDefault ? false : true,
    },
  });
}

/**
 * Get all payment methods of a user
 */
export async function listUserPaymentMethods(userId: string) {
  return prisma.userPaymentMethod.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" }, // default card first
      { createdAt: "desc" },
    ],
  });
}

/**
 * Delete a user's payment method
 */
export async function deletePaymentMethod(
  userId: string,
  id: string
) {
  // 1️⃣ Ensure the payment method belongs to the user
  const method = await prisma.userPaymentMethod.findFirstOrThrow({
    where: { id, userId },
  });

  // 2️⃣ Detach from Stripe (safe operation)
  await stripe.paymentMethods.detach(method.stripePmId);

  // 3️⃣ Delete from DB
  const deleted = await prisma.userPaymentMethod.delete({
    where: { id },
  });

  // 4️⃣ If deleted card was default, set another as default
  if (method.isDefault) {
    const nextMethod = await prisma.userPaymentMethod.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (nextMethod) {
      await prisma.userPaymentMethod.update({
        where: { id: nextMethod.id },
        data: { isDefault: true },
      });
    }
  }

  return deleted;
}

/**
 * Set a payment method as default
 */
export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string
) {
  // 1️⃣ Verify ownership
  const paymentMethod = await prisma.userPaymentMethod.findFirst({
    where: {
      id: paymentMethodId,
      userId,
    },
  });

  if (!paymentMethod) {
    throw new Error("Payment method not found");
  }

  // 2️⃣ Remove default from all user's payment methods
  await prisma.userPaymentMethod.updateMany({
    where: { userId },
    data: { isDefault: false },
  });

  // 3️⃣ Set selected method as default
  return prisma.userPaymentMethod.update({
    where: { id: paymentMethodId },
    data: { isDefault: true },
  });
}
