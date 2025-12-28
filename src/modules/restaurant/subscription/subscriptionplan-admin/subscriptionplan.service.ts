import prisma from "../../../../config/prisma";
import { stripe } from "../../../../libs/stripe";
import { CreateSubscriptionPlanInput, UpdateSubscriptionPlanInput } from "./subscriptionplan.schema";

export async function createPlan(data: CreateSubscriptionPlanInput) {
  // 1. Create Stripe Product
  const product = await stripe.products.create({
    name: data.name,
  });

  // 2. Create Stripe Price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(data.price * 100),
    currency: "usd",
    recurring: {
      interval: data.interval === "MONTHLY" ? "month" : "year",
    },
  });

  // 3. Save in DB
  return prisma.subscriptionPlan.create({
    data: {
      name: data.name,
      price: data.price,
      interval: data.interval,
      features: data.features,
      stripePriceId: price.id,
    },
  });
}

export function getPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
  });
}

export function getPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

export async function updatePlan(
  id: string,
  data: UpdateSubscriptionPlanInput
) {
  const updateData: any = {};
  
  // Only update fields that are provided and not empty
  if (data.name !== undefined && data.name !== null && data.name.trim() !== "") {
    updateData.name = data.name;
  }
  if (data.features !== undefined && data.features !== null) {
    updateData.features = data.features;
  }
  
  // If no fields to update, return current plan
  if (Object.keys(updateData).length === 0) {
    return prisma.subscriptionPlan.findUnique({ where: { id } });
  }
  
  return prisma.subscriptionPlan.update({
    where: { id },
    data: updateData,
  });
}

export async function deactivatePlan(id: string) {
  return prisma.subscriptionPlan.update({
    where: { id },
    data: { isActive: false },
  });
}
