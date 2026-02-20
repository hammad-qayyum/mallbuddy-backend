import { stripe } from "../../../libs/stripe";
import prisma from "../../../config/prisma";
import dotenv from "dotenv";
dotenv.config();
/**
 * ✅ Idempotent: Get or create Stripe Connect account
 * This function GUARANTEES only ONE account per restaurant
 */
export async function getOrCreateRestaurantStripeAccount(restaurantId: string) {
  console.log(`[Stripe Connect] Get or create account for restaurant ${restaurantId}`);

  const restaurant = await prisma.restaurant.findUnique({
    where: { userId: restaurantId },
  });

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  // 🔒 HARD STOP: prevent duplicate Stripe accounts forever
  if (restaurant.stripeConnectAccountId) {
    console.log(
      `[Stripe Connect] Existing account found: ${restaurant.stripeConnectAccountId}`
    );
    return restaurant.stripeConnectAccountId;
  }

  const country = process.env.STRIPE_DEFAULT_COUNTRY || "US";
  const accountType = (process.env.STRIPE_ACCOUNT_TYPE || "express") as "express" | "standard" | "custom";

  const account = await stripe.accounts.create({
    type: accountType,
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // ✅ Save account ID to database immediately after creation
  const updated = await prisma.restaurant.update({
    where: { userId: restaurantId },
    data: {
      stripeConnectAccountId: account.id,
      stripeAccountStatus: "pending",
    },
  });

  // ✅ Verify the save worked (prevent orphan accounts)
  if (!updated.stripeConnectAccountId || updated.stripeConnectAccountId !== account.id) {
    console.error(`[Stripe Connect] CRITICAL: Account ID not saved correctly!`, {
      restaurantId,
      expectedAccountId: account.id,
      savedAccountId: updated.stripeConnectAccountId,
    });
    throw new Error(`Failed to save account ID to database. Expected: ${account.id}, Got: ${updated.stripeConnectAccountId || 'null'}`);
  }

  console.log(`[Stripe Connect] New account created and saved successfully`, {
    restaurantId,
    accountId: account.id,
  });

  return account.id;
}

/**
 * ✅ Generate onboarding link (NEVER creates account)
 */
export async function generateOnboardingLink(restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { userId: restaurantId },
  });

  if (!restaurant?.stripeConnectAccountId) {
    throw new Error("Stripe account not created");
  }

  // Frontend URL should be set in production - fallback only for development
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const refreshPath = process.env.STRIPE_REFRESH_PATH || "/restaurants/stripe/refresh";
  const returnPath = process.env.STRIPE_RETURN_PATH || "/restaurants/stripe/return";

  const accountLink = await stripe.accountLinks.create({
    account: restaurant.stripeConnectAccountId,
    refresh_url: `${frontendUrl}${refreshPath}`,
    return_url: `${frontendUrl}${returnPath}`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Optional manual status check (webhook is source of truth)
 */
/**
 * Get Stripe account status - READ ONLY, NEVER creates accounts
 * This only retrieves status from Stripe API for an existing account
 */
export async function getRestaurantStripeAccountStatus(restaurantId: string) {
    console.log(`[Stripe Connect] Getting account status for restaurant ${restaurantId}`);
  
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: restaurantId },
    });
  
    if (!restaurant) {
      console.error(`[Stripe Connect] Restaurant not found: ${restaurantId}`);
      throw new Error("Restaurant not found");
    }
  
    if (!restaurant.stripeConnectAccountId) {
      console.error(`[Stripe Connect] No Stripe account ID for restaurant: ${restaurantId}`);
      throw new Error("Restaurant Stripe account not found. Please create an account first.");
    }
  
    // Retrieve account from Stripe - this is READ ONLY, never creates
    let account;
    try {
      account = await stripe.accounts.retrieve(restaurant.stripeConnectAccountId);
    } catch (error: any) {
      console.error(`[Stripe Connect] Failed to retrieve account`, {
        restaurantId,
        accountId: restaurant.stripeConnectAccountId,
        error: error.message,
      });
      throw new Error(`Failed to retrieve account status: ${error.message}`);
    }
  
    const status = {
      status:
        account.charges_enabled && account.payouts_enabled
          ? "completed"
          : account.requirements?.disabled_reason
          ? "rejected"
          : "pending",
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };
  
    console.log(`[Stripe Connect] Account status retrieved`, {
      restaurantId,
      accountId: restaurant.stripeConnectAccountId,
      ...status,
    });
  
    return status;
  }